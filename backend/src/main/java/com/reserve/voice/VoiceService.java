package com.reserve.voice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.RecordComponent;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoiceService {

    static final String NOT_DONOR = "This number is not registered as a donor on ReServe";
    static final String UNSAFE = "We can only take food that is covered, kept at a safe temperature, never served, and has allergens noted";
    static final String UNREADABLE = "Sorry, I could not read that request";
    static final int MAX_BODY = 16 * 1024;
    static final String QUANTITY = "Tell me how much food there is, as a whole number";

    private final byte[] secret;
    private final ZoneId zone;
    private final UserRepository users;
    private final DonationService donations;
    private final Validator validator;
    private final ObjectMapper mapper;

    public VoiceService(@Value("${app.voice.secret}") String secret, @Value("${app.zone}") String zone,
                        UserRepository users, DonationService donations, Validator validator, ObjectMapper mapper) {
        this.secret = secret.isBlank() ? null : secret.getBytes(StandardCharsets.UTF_8);
        this.zone = ZoneId.of(zone);
        this.users = users;
        this.donations = donations;
        this.validator = validator;
        this.mapper = mapper;
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

    public String body(InputStream in) throws IOException {
        byte[] bytes = in.readNBytes(MAX_BODY + 1);
        if (bytes.length > MAX_BODY) {
            throw ApiException.payloadTooLarge("Request is too large");
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    public <T> T read(String body, Class<T> type) {
        try {
            T value = body == null || body.isBlank() ? null : mapper.readValue(body, type);
            if (value == null) throw ApiException.badRequest(UNREADABLE, null);
            return value;
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest(UNREADABLE, null);
        }
    }

    @Transactional(readOnly = true)
    public VoiceRequests.LookupResult lookup(VoiceRequests.Lookup req) {
        return donor(req.phone())
                .map(u -> new VoiceRequests.LookupResult(true, u.getName(), u.getAddress()))
                .orElse(new VoiceRequests.LookupResult(false, null, null));
    }

    @Transactional
    public VoiceRequests.Posted post(VoiceRequests.Donation req) {
        User donor = donor(req.phone()).orElseThrow(() -> ApiException.notFound(NOT_DONOR));
        if (!(isTrue(req.covered()) && isTrue(req.safeTemp()) && isTrue(req.noReturns()) && isTrue(req.allergensNoted()))) {
            throw ApiException.badRequest(UNSAFE, Map.of("safetyChecks", UNSAFE));
        }
        Integer quantity = quantity(req.quantity());
        Diet diet = choice(Diet.class, req.diet(), null, "diet", "Tell me if the food is veg or non veg");
        Category category = choice(Category.class, req.category(), Category.COOKED, "category", "I did not catch the food category");
        Unit unit = choice(Unit.class, req.unit(), Unit.SERVINGS, "unit", "Say servings, kg or packs");

        ZonedDateTime now = ZonedDateTime.now(zone);
        OffsetDateTime pickupFrom = blank(req.pickupFrom()) ? now.toOffsetDateTime() : time(req.pickupFrom(), now, "pickupFrom", "pickup start");
        OffsetDateTime pickupUntil = time(req.pickupUntil(), now, "pickupUntil", "pickup end");
        OffsetDateTime bestBefore = time(req.bestBefore(), now, "bestBefore", "best before");

        DonationRequests.Create create = new DonationRequests.Create(blank(req.title()) ? null : req.title().trim(), diet, category,
                quantity, unit, null, null, blank(req.note()) ? null : req.note().trim(), donor.getAddress(), donor.getLat(), donor.getLng(),
                null, bestBefore, pickupFrom, pickupUntil, List.of(SafetyCheck.values()), null);
        requireValid(create);
        DonationDto d;
        try {
            d = donations.create(donor, create, Source.VOICE);
        } catch (ApiException e) {
            if (e.fields() == null || e.fields().isEmpty()) throw e;
            throw spoken(e.fields());
        }
        String message = "Done. " + d.code() + ", " + unit.label(d.quantity()) + " of " + d.title().toLowerCase(Locale.ROOT)
                + ", is live. Pickup by " + SpokenTime.speak(d.pickupUntil(), now) + ".";
        return new VoiceRequests.Posted(d.code(), message);
    }

    // Runs the same bean constraints as the app form, reporting fields in declaration order
    private void requireValid(DonationRequests.Create create) {
        Set<ConstraintViolation<DonationRequests.Create>> violations = validator.validate(create);
        if (violations.isEmpty()) return;
        Map<String, String> fields = new LinkedHashMap<>();
        for (RecordComponent c : DonationRequests.Create.class.getRecordComponents()) {
            violations.stream().filter(v -> v.getPropertyPath().toString().equals(c.getName())).findFirst()
                    .ifPresent(v -> fields.put(c.getName(), v.getMessage()));
        }
        throw spoken(fields);
    }

    private Optional<User> donor(String phone) {
        String digits = VoicePhone.normalize(phone);
        return digits == null ? Optional.empty() : users.findByPhone(digits).filter(u -> u.getRole() == Role.DONOR);
    }

    private static ApiException spoken(Map<String, String> fields) {
        return ApiException.badRequest(fields.values().iterator().next(), fields);
    }

    private static Integer quantity(String text) {
        if (blank(text)) return null;
        try {
            return Integer.parseInt(text.trim());
        } catch (NumberFormatException e) {
            throw invalid("quantity", QUANTITY);
        }
    }

    private static OffsetDateTime time(String text, ZonedDateTime now, String field, String spoken) {
        try {
            return SpokenTime.parse(text, now);
        } catch (IllegalArgumentException e) {
            throw invalid(field, "I did not catch the " + spoken + " time. Use minutes from now like +90, or a clock time like 21:00");
        }
    }

    static <E extends Enum<E>> E choice(Class<E> type, String text, E fallback, String field, String message) {
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

    // Only an explicit true counts: JSON true or the text "true"
    static boolean isTrue(String s) {
        return s != null && s.trim().equalsIgnoreCase("true");
    }

    // A templated parameter the model left out can arrive as an empty string, None or null
    static boolean blank(String s) {
        return s == null || s.isBlank() || s.trim().equalsIgnoreCase("none") || s.trim().equalsIgnoreCase("null");
    }
}
