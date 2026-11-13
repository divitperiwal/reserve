package com.reserve.donation;

import com.reserve.activity.ActivityService;
import com.reserve.activity.ActivityType;
import com.reserve.auth.AuthUser;
import com.reserve.common.ApiException;
import com.reserve.stream.SseHub;
import com.reserve.user.Role;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import com.reserve.user.UserService;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DonationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final double DEFAULT_RADIUS_KM = 7;
    private static final Duration CLAIM_HOLD = Duration.ofMinutes(30);

    private final DonationRepository donations;
    private final LocationPingRepository pings;
    private final UserRepository userRepository;
    private final UserService users;
    private final ActivityService activities;
    private final DonationMapper mapper;
    private final SseHub hub;

    public DonationService(DonationRepository donations, LocationPingRepository pings, UserRepository userRepository,
                           UserService users, ActivityService activities, DonationMapper mapper, SseHub hub) {
        this.donations = donations;
        this.pings = pings;
        this.userRepository = userRepository;
        this.users = users;
        this.activities = activities;
        this.mapper = mapper;
        this.hub = hub;
    }

    public static String handoverCode() {
        return String.format("%04d", RANDOM.nextInt(10_000));
    }

    // Kitchens see food waiting for a kitchen; volunteers see food a kitchen has accepted
    @Transactional(readOnly = true)
    public List<DonationDto> feed(AuthUser me, FeedQuery query) {
        User viewer = users.get(me.id());
        double lat = query.lat() != null ? query.lat() : viewer.getLat();
        double lng = query.lng() != null ? query.lng() : viewer.getLng();
        double radius = query.radiusKm() != null ? query.radiusKm() : DEFAULT_RADIUS_KM;
        OffsetDateTime now = OffsetDateTime.now();
        String text = query.q() == null || query.q().isBlank() ? null : query.q().trim().toLowerCase(Locale.ROOT);

        Status listed = me.role() == Role.NGO ? Status.AVAILABLE : Status.ACCEPTED;
        Stream<Donation> stream = donations.findByStatusAndPickupUntilAfter(listed, now).stream()
                .filter(d -> Geo.distanceKm(lat, lng, d.getLat(), d.getLng()) <= radius)
                .filter(d -> query.withinHours() == null || !d.getPickupUntil().isAfter(now.plusMinutes(Math.round(query.withinHours() * 60))))
                .filter(d -> query.diet() == null || d.getDiet() == query.diet())
                .filter(d -> query.category() == null || d.getCategory() == query.category())
                .filter(d -> text == null || matches(d, text));
        Comparator<Donation> order = "distance".equals(query.sort())
                ? Comparator.comparingDouble(d -> Geo.distanceKm(lat, lng, d.getLat(), d.getLng()))
                : Comparator.comparing(Donation::getPickupUntil);
        return mapper.toDtos(stream.sorted(order).toList(), me.id(), lat, lng);
    }

    @Transactional(readOnly = true)
    public List<DonationDto> mine(AuthUser me) {
        User viewer = users.get(me.id());
        Comparator<Donation> activeFirst = Comparator.comparing(d -> !d.getStatus().isActiveRun());
        List<Donation> list = switch (me.role()) {
            case DONOR -> donations.findByDonorIdOrderByCreatedAtDescIdDesc(me.id());
            case VOLUNTEER -> donations.findByVolunteerIdOrderByClaimedAtDesc(me.id()).stream().sorted(activeFirst).toList();
            case NGO -> donations.findByNgoIdOrderByClaimedAtDesc(me.id()).stream().sorted(activeFirst).toList();
        };
        return mapper.toDtos(list, me.id(), viewer.getLat(), viewer.getLng());
    }

    @Transactional(readOnly = true)
    public DonationDto get(AuthUser me, Long id) {
        return view(find(id), users.get(me.id()));
    }

    @Transactional
    public DonationDto create(AuthUser me, DonationRequests.Create req) {
        validate(req);
        User donor = users.get(me.id());
        Donation d = new Donation(donor, req.title().trim(), req.diet(), req.category(), req.quantity(), req.unit());
        if (req.weightKg() != null) d.setWeightKg(req.weightKg());
        d.setContainers(req.containers());
        d.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());
        d.setPhotoUrl(req.photoUrl());
        d.setLocation(req.address().trim(), req.lat(), req.lng());
        d.setPreparedAt(req.preparedAt());
        d.setBestBefore(req.bestBefore());
        d.setPickupFrom(req.pickupFrom());
        d.setPickupUntil(req.pickupUntil());
        d.setSafetyCheckList(req.safetyChecks());
        d.setPickupCode(handoverCode());
        d.setDropCode(handoverCode());
        donations.save(d);
        activities.record(ActivityType.POSTED, donor, d);
        publish(d);
        return view(d, donor);
    }

    @Transactional
    public void cancel(AuthUser me, Long id) {
        Donation d = find(id);
        requireSame(d.getDonor(), me, "Only the donor can cancel this donation");
        if (!d.getStatus().isOpen()) {
            throw ApiException.conflict("Only donations waiting for pickup can be cancelled");
        }
        d.setStatus(Status.CANCELLED);
        publish(d);
    }

    // A kitchen takes all of a listing or only the amount it needs; the rest stays open for other kitchens
    @Transactional
    public DonationDto accept(AuthUser me, Long id, Integer quantity) {
        Donation d = find(id);
        User ngo = users.get(me.id());
        if (!ngo.isAcceptingFood()) {
            throw ApiException.conflict("Turn on Accepting food to take new food");
        }
        if (d.getStatus() != Status.AVAILABLE || !d.getPickupUntil().isAfter(OffsetDateTime.now())) {
            throw ApiException.conflict("This food is no longer available");
        }
        int part = quantity == null ? d.getQuantity() : quantity;
        if (part < 1 || part > d.getQuantity()) {
            String message = "Choose between 1 and " + d.getQuantity();
            throw ApiException.badRequest(message, Map.of("quantity", message));
        }
        Donation taken = part == d.getQuantity() ? d : donations.save(d.split(part));
        taken.setNgo(ngo);
        taken.setStatus(Status.ACCEPTED);
        donations.flush();
        activities.record(ActivityType.ACCEPTED, ngo, taken);
        if (taken != d) {
            publish(d);
        }
        publish(taken);
        return view(taken, ngo);
    }

    // The kitchen gives back food it accepted, as long as no volunteer has taken the job
    @Transactional
    public DonationDto withdraw(AuthUser me, Long id) {
        Donation d = find(id);
        requireSame(d.getNgo(), me, "Only the kitchen that accepted this can give it back");
        if (d.getStatus() != Status.ACCEPTED) {
            throw ApiException.conflict("A volunteer is already on this pickup");
        }
        User ngo = d.getNgo();
        d.setNgo(null);
        d.setStatus(Status.AVAILABLE);
        if (d.getPickupUntil().isBefore(OffsetDateTime.now())) {
            expire(d);
        } else {
            publish(d);
        }
        return view(d, ngo);
    }

    @Transactional
    public DonationDto claim(AuthUser me, Long id) {
        User volunteer = users.get(me.id());
        if (donations.countByVolunteerIdAndStatusIn(volunteer.getId(), List.of(Status.CLAIMED, Status.PICKED_UP)) > 0) {
            throw ApiException.conflict("Finish your current pickup before claiming another");
        }
        if (donations.claim(id, volunteer.getId()) == 0) {
            throw ApiException.conflict("This pickup is no longer available");
        }
        Donation claimed = find(id);
        activities.record(ActivityType.CLAIMED, claimed.getVolunteer(), claimed);
        publish(claimed);
        return view(claimed, claimed.getVolunteer());
    }

    @Transactional
    public DonationDto release(AuthUser me, Long id) {
        Donation d = find(id);
        requireSame(d.getVolunteer(), me, "Only the assigned volunteer can release this pickup");
        if (d.getStatus() != Status.CLAIMED) {
            throw ApiException.conflict("Only claimed pickups can be released");
        }
        User volunteer = d.getVolunteer();
        unclaim(d);
        return view(d, volunteer);
    }

    @Transactional
    public DonationDto confirmPickup(AuthUser me, Long id, String code) {
        Donation d = find(id);
        requireSame(d.getDonor(), me, "Only the donor can confirm this pickup");
        if (d.getStatus() != Status.CLAIMED) {
            throw ApiException.conflict("This donation is not waiting for pickup");
        }
        checkCode(d.getPickupCode(), code);
        d.setStatus(Status.PICKED_UP);
        d.setPickedUpAt(OffsetDateTime.now());
        activities.record(ActivityType.PICKED_UP, d.getVolunteer(), d);
        publish(d);
        return view(d, d.getDonor());
    }

    @Transactional
    public DonationDto confirmDelivery(AuthUser me, Long id, String code) {
        Donation d = find(id);
        requireSame(d.getNgo(), me, "Only the receiving NGO can confirm this delivery");
        if (d.getStatus() != Status.PICKED_UP) {
            throw ApiException.conflict("This donation is not on its way yet");
        }
        checkCode(d.getDropCode(), code);
        d.setStatus(Status.DELIVERED);
        d.setDeliveredAt(OffsetDateTime.now());
        activities.record(ActivityType.DELIVERED, d.getVolunteer(), d);
        publish(d);
        return view(d, d.getNgo());
    }

    @Transactional
    public void recordLocation(AuthUser me, Long id, double lat, double lng) {
        Donation d = find(id);
        requireSame(d.getVolunteer(), me, "Only the assigned volunteer can share location");
        if (!d.getStatus().isActiveRun()) {
            throw ApiException.conflict("This pickup is no longer active");
        }
        OffsetDateTime now = OffsetDateTime.now();
        donations.updateLocation(id, lat, lng, now);
        pings.save(new LocationPing(d.getId(), lat, lng, now));
        hub.sendTo(List.of(d.getDonor().getId(), d.getVolunteer().getId(), d.getNgo().getId()), "location",
                new LocationEvent(d.getId(), lat, lng, now));
    }

    @Transactional(readOnly = true)
    public List<GeoPoint> route(AuthUser me, Long id) {
        Donation d = find(id);
        if (!d.isParty(me.id())) {
            throw ApiException.forbidden("Only people on this pickup can see its route");
        }
        return pings.findByDonationIdOrderByRecordedAtAsc(id).stream()
                .map(p -> new GeoPoint(p.getLat(), p.getLng(), p.getRecordedAt())).toList();
    }

    // Ids of open listings whose pickup window has closed
    @Transactional(readOnly = true)
    public List<Long> overdueIds() {
        return donations.findByStatusInAndPickupUntilBefore(List.of(Status.AVAILABLE, Status.ACCEPTED), OffsetDateTime.now()).stream().map(Donation::getId).toList();
    }

    // Expires one overdue open listing in its own transaction; PICKED_UP ones never expire
    @Transactional
    public void expireOne(Long id) {
        Donation d = find(id);
        if (d.getStatus().isOpen() && d.getPickupUntil().isBefore(OffsetDateTime.now())) {
            expire(d);
        }
    }

    // CLAIMED rows with no claim time start their 30 minute clock now
    @Transactional
    public void startClaimClocks() {
        OffsetDateTime now = OffsetDateTime.now();
        donations.findByStatusAndClaimedAtIsNull(Status.CLAIMED).forEach(d -> d.setClaimedAt(now));
    }

    // Ids of CLAIMED pickups not collected within 30 minutes
    @Transactional(readOnly = true)
    public List<Long> stalledIds() {
        return donations.findByStatusAndClaimedAtBefore(Status.CLAIMED, OffsetDateTime.now().minus(CLAIM_HOLD)).stream().map(Donation::getId).toList();
    }

    // Releases one stalled claim in its own transaction, rechecking it is still stalled
    @Transactional
    public void releaseOne(Long id) {
        Donation d = find(id);
        if (d.getStatus() == Status.CLAIMED && d.getClaimedAt() != null && d.getClaimedAt().isBefore(OffsetDateTime.now().minus(CLAIM_HOLD))) {
            unclaim(d);
        }
    }

    // Counts on-duty volunteers within the default radius of the donation, for its donor only
    @Transactional(readOnly = true)
    public NearbyVolunteers nearbyVolunteers(AuthUser me, Long id) {
        Donation d = find(id);
        requireSame(d.getDonor(), me, "Only the donor can see nearby volunteers");
        int count = (int) userRepository.findByRoleAndOnDutyTrue(Role.VOLUNTEER).stream()
                .filter(v -> Geo.distanceKm(d.getLat(), d.getLng(), v.getLat(), v.getLng()) <= DEFAULT_RADIUS_KM).count();
        return new NearbyVolunteers(count);
    }

    // Records RELEASED and clears the volunteer; the kitchen keeps the food, which goes back to volunteers or expires
    private void unclaim(Donation d) {
        activities.record(ActivityType.RELEASED, d.getVolunteer(), d);
        d.setVolunteer(null);
        d.setClaimedAt(null);
        d.setCurrentLocation(null, null, null);
        d.setStatus(Status.ACCEPTED);
        if (d.getPickupUntil().isBefore(OffsetDateTime.now())) {
            expire(d);
        } else {
            publish(d);
        }
    }

    private void expire(Donation d) {
        d.setStatus(Status.EXPIRED);
        activities.record(ActivityType.EXPIRED, d.getDonor(), d);
        publish(d);
    }

    private DonationDto view(Donation d, User viewer) {
        return mapper.toDto(d, viewer.getId(), viewer.getLat(), viewer.getLng());
    }

    private void publish(Donation d) {
        hub.broadcast("donation", mapper.toPublicDto(d));
    }

    private Donation find(Long id) {
        return donations.findById(id).orElseThrow(() -> ApiException.notFound("Donation not found"));
    }

    private static void requireSame(User expected, AuthUser me, String message) {
        if (expected == null || !expected.getId().equals(me.id())) {
            throw ApiException.forbidden(message);
        }
    }

    private static void checkCode(String expected, String given) {
        if (!Objects.equals(expected, given == null ? null : given.trim())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That code doesn't match", Map.of("code", "That code doesn't match"));
        }
    }

    private static boolean matches(Donation d, String text) {
        return d.getTitle().toLowerCase(Locale.ROOT).contains(text)
                || d.getDonor().getName().toLowerCase(Locale.ROOT).contains(text)
                || d.getAddress().toLowerCase(Locale.ROOT).contains(text);
    }

    private static void validate(DonationRequests.Create req) {
        Map<String, String> fields = new LinkedHashMap<>();
        if (!req.bestBefore().isAfter(OffsetDateTime.now())) {
            fields.put("bestBefore", "Best-before must be in the future");
        }
        if (!req.pickupFrom().isBefore(req.pickupUntil())) {
            fields.put("pickupUntil", "Pickup window must end after it starts");
        } else if (req.pickupUntil().isAfter(req.bestBefore())) {
            fields.put("pickupUntil", "Pickup window must end by the best-before time");
        }
        if (!req.safetyChecks().containsAll(EnumSet.allOf(SafetyCheck.class))) {
            fields.put("safetyChecks", "Confirm all safety checks");
        }
        if (req.photoUrl() != null && !req.photoUrl().matches("/api/uploads/[0-9a-f-]{36}\\.(jpg|png|webp)")) {
            fields.put("photoUrl", "Upload the photo again");
        }
        if (!fields.isEmpty()) {
            throw ApiException.badRequest("Please check the highlighted fields", fields);
        }
    }
}
