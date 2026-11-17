package com.reserve.donation;

import com.reserve.user.NgoRef;
import com.reserve.user.PersonRef;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class DonationMapper {

    private final DonationRepository donations;

    public DonationMapper(DonationRepository donations) {
        this.donations = donations;
    }

    public List<DonationDto> toDtos(List<Donation> list, Long viewerId, Double lat, Double lng) {
        Map<Long, Long> rescues = new HashMap<>();
        if (list.stream().anyMatch(d -> d.getVolunteer() != null)) {
            donations.deliveredCountsByVolunteer().forEach(row -> rescues.put((Long) row[0], (Long) row[1]));
        }
        return list.stream()
                .map(d -> build(d, viewerId, lat, lng, d.getVolunteer() == null ? null : rescues.getOrDefault(d.getVolunteer().getId(), 0L)))
                .toList();
    }

    public DonationDto toDto(Donation d, Long viewerId, Double lat, Double lng) {
        Long rescues = d.getVolunteer() == null ? null
                : donations.countByVolunteerIdAndStatus(d.getVolunteer().getId(), Status.DELIVERED);
        return build(d, viewerId, lat, lng, rescues);
    }

    // Broadcast form: no viewer, so codes and distance are always left out
    public DonationDto toPublicDto(Donation d) {
        return toDto(d, null, null, null);
    }

    private DonationDto build(Donation d, Long viewerId, Double lat, Double lng, Long volunteerRescues) {
        boolean assignedVolunteer = viewerId != null && d.getVolunteer() != null && d.getVolunteer().getId().equals(viewerId);
        Double distance = lat == null || lng == null ? null
                : Math.round(Geo.distanceKm(lat, lng, d.getLat(), d.getLng()) * 10) / 10.0;
        GeoPoint last = d.getCurLat() == null ? null : new GeoPoint(d.getCurLat(), d.getCurLng(), d.getLocAt());
        return new DonationDto(
                d.getId(), d.code(), d.getTitle(), d.getDiet(), d.getCategory(), d.getQuantity(), d.getUnit(),
                d.getWeightKg(), d.getContainers(), d.getPhotoUrl(), d.getNote(), d.getAddress(), d.getLat(), d.getLng(),
                d.getPreparedAt(), d.getBestBefore(), d.getPickupFrom(), d.getPickupUntil(), d.safetyCheckList(),
                d.getStatus(), PersonRef.of(d.getDonor(), null), PersonRef.of(d.getVolunteer(), volunteerRescues),
                NgoRef.of(d.getNgo()), d.getClaimedAt(), d.getPickedUpAt(), d.getDeliveredAt(), d.getCreatedAt(),
                distance, d.meals(),
                assignedVolunteer ? d.getPickupCode() : null,
                assignedVolunteer ? d.getDropCode() : null,
                last);
    }
}
