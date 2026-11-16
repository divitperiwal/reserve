package com.reserve.voice;

import com.reserve.common.ApiException;
import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.DonationDto;
import com.reserve.donation.DonationRequests;
import com.reserve.donation.DonationService;
import com.reserve.donation.SafetyCheck;
import com.reserve.donation.Source;
import com.reserve.donation.Unit;
import com.reserve.user.Role;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoiceService {

    static final String NOT_DONOR = "This number is not registered as a donor on ReServe";
    static final String UNSAFE = "We can only take food that is covered, kept at a safe temperature, never served, and has allergens noted";

    private final byte[] secret;
    private final ZoneId zone;
    private final UserRepository users;
    private final DonationService donations;

    public VoiceService(@Value("${app.voice.secret}") String secret, @Value("${app.zone}") String zone,
                        UserRepository users, DonationService donations) {
        this.secret = secret.isBlank() ? null : secret.getBytes(StandardCharsets.UTF_8);
        this.zone = ZoneId.of(zone);
        this.users = users;
        this.donations = donations;
    }

    // With no secret configured the hotline is off and its endpoints look absent
    public void checkSecret(String given) {
        if (secret == null) {
            throw ApiException.notFound("Not found");
        }
        if (given == null || !MessageDigest.isEqual(secret, given.getBytes(StandardCharsets.UTF_8))) {
            throw ApiException.unauthorized("Wrong voice secret");
        }
    }

    @Transactional(readOnly = true)
    public VoiceRequests.LookupResult lookup(String phone) {
        return donor(phone)
                .map(u -> new VoiceRequests.LookupResult(true, u.getName(), u.getAddress()))
                .orElse(new VoiceRequests.LookupResult(false, null, null));
    }

    @Transactional
    public VoiceRequests.Posted post(VoiceRequests.Donation req) {
        User donor = donor(req.phone()).orElseThrow(() -> ApiException.notFound(NOT_DONOR));
        if (!(isTrue(req.covered()) && isTrue(req.safeTemp()) && isTrue(req.noReturns()) && isTrue(req.allergensNoted()))) {
            throw ApiException.badRequest(UNSAFE, Map.of("safetyChecks", UNSAFE));
        }
        String title = req.title() == null ? "" : req.title().trim();
        if (title.isEmpty()) throw invalid("title", "Tell me what the food is");
        if (title.length() > 160) throw invalid("title", "Please give a shorter name for the food");
        if (req.quantity() == null || req.quantity() < 1) throw invalid("quantity", "Tell me how much food there is");
        if (req.note() != null && req.note().length() > 500) throw invalid("note", "Please keep the note shorter");
        Diet diet = choice(Diet.class, req.diet(), null, "diet", "Tell me if the food is veg or non veg");
        Category category = choice(Category.class, req.category(), Category.COOKED, "category", "I did not catch the food category");
        Unit unit = choice(Unit.class, req.unit(), Unit.SERVINGS, "unit", "Say servings, kg or packs");

        ZonedDateTime now = ZonedDateTime.now(zone);
        OffsetDateTime pickupFrom = blank(req.pickupFrom()) ? now.toOffsetDateTime() : time(req.pickupFrom(), now, "pickupFrom", "pickup start");
        OffsetDateTime pickupUntil = time(req.pickupUntil(), now, "pickupUntil", "pickup end");
        OffsetDateTime bestBefore = time(req.bestBefore(), now, "bestBefore", "best before");

        DonationRequests.Create create = new DonationRequests.Create(title, diet, category, req.quantity(), unit, null, null,
                blank(req.note()) ? null : req.note().trim(), donor.getAddress(), donor.getLat(), donor.getLng(),
                null, bestBefore, pickupFrom, pickupUntil, List.of(SafetyCheck.values()), null);
        DonationDto d;
        try {
            d = donations.create(donor, create, Source.VOICE);
        } catch (ApiException e) {
            if (e.fields() == null || e.fields().isEmpty()) throw e;
            throw ApiException.badRequest(e.fields().values().iterator().next(), e.fields());
        }
        String message = "Done. " + d.code() + ", " + unit.label(d.quantity()) + " of " + d.title().toLowerCase(Locale.ROOT)
                + ", is live. Pickup by " + SpokenTime.speak(d.pickupUntil(), now) + ".";
        return new VoiceRequests.Posted(d.code(), message);
    }

    private Optional<User> donor(String phone) {
        String digits = VoicePhone.normalize(phone);
        return digits == null ? Optional.empty() : users.findByPhone(digits).filter(u -> u.getRole() == Role.DONOR);
    }

    private static OffsetDateTime time(String text, ZonedDateTime now, String field, String spoken) {
        try {
            return SpokenTime.parse(text, now);
        } catch (IllegalArgumentException e) {
            throw invalid(field, "I did not catch the " + spoken + " time. Use minutes from now like +90, or a clock time like 21:00");
        }
    }

    private static <E extends Enum<E>> E choice(Class<E> type, String text, E fallback, String field, String message) {
        if (blank(text)) {
            if (fallback == null) throw invalid(field, message);
            return fallback;
        }
        try {
            return Enum.valueOf(type, text.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z]+", "_"));
        } catch (IllegalArgumentException e) {
            throw invalid(field, message);
        }
    }

    private static ApiException invalid(String field, String message) {
        return ApiException.badRequest(message, Map.of(field, message));
    }

    private static boolean isTrue(Boolean b) {
        return Boolean.TRUE.equals(b);
    }

    // A templated parameter the model left out can arrive as an empty string, None or null
    private static boolean blank(String s) {
        return s == null || s.isBlank() || s.trim().equalsIgnoreCase("none") || s.trim().equalsIgnoreCase("null");
    }
}
