package com.reserve.voice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reserve.common.ApiException;
import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.DonationDto;
import com.reserve.donation.DonationRequests;
import com.reserve.donation.DonationService;
import com.reserve.donation.Source;
import com.reserve.donation.Unit;
import com.reserve.user.Role;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import jakarta.validation.Validation;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;

class VoiceServiceTest {

    private static final String SAFE = "\"covered\":true,\"safeTemp\":\"TRUE\",\"noReturns\":\"true\",\"allergensNoted\":true";

    private final UserRepository users = mock(UserRepository.class);
    private final DonationService donations = mock(DonationService.class);
    private final VoiceService voice = new VoiceService("s3cret", "Asia/Kolkata", users, donations,
            Validation.buildDefaultValidatorFactory().getValidator(), new ObjectMapper());

    VoiceServiceTest() {
        User donor = new User(Role.DONOR, "Kalyan Mahal", "9840100001", "x", "12 Rajaji Street", 12.8, 80.0);
        when(users.findByPhone("9840100001")).thenReturn(Optional.of(donor));
    }

    private ApiException rejected(String json) {
        return assertThrows(ApiException.class, () -> voice.post(voice.read(json, VoiceRequests.Donation.class)));
    }

    private static String body(String fields, String safety) {
        return "{\"phone\":\"+91 98401 00001\",\"diet\":\"veg\",\"quantity\":50,\"pickupUntil\":\"+60\",\"bestBefore\":\"+120\","
                + fields + (fields.isEmpty() || safety.isEmpty() ? "" : ",") + safety + "}";
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "\"1\"", "2", "\"yes\"", "\"None\"", "\"\"", "false", "null"})
    void onlyAnExplicitTrueIsSafe(String value) {
        String safety = SAFE.replace("\"covered\":true", "\"covered\":" + value);
        ApiException e = rejected(body("\"title\":\"Rice\"", safety));
        assertEquals(HttpStatus.BAD_REQUEST, e.status());
        assertEquals(VoiceService.UNSAFE, e.getMessage());
    }

    @Test
    void missingSafetyAnswerIsUnsafe() {
        ApiException e = rejected(body("\"title\":\"Rice\"", SAFE.replace("\"covered\":true,", "")));
        assertEquals(VoiceService.UNSAFE, e.getMessage());
    }

    @Test
    void createConstraintsRunAndSpeakTheFirstViolation() {
        ApiException blankTitle = rejected(body("\"title\":\"  \"", SAFE));
        assertEquals("Add a title", blankTitle.getMessage());
        assertEquals("Add a title", blankTitle.fields().get("title"));

        ApiException longTitle = rejected(body("\"title\":\"" + "a".repeat(161) + "\"", SAFE));
        assertEquals("Title is too long", longTitle.getMessage());

        ApiException zero = rejected(body("\"title\":\"Rice\"", SAFE).replace("\"quantity\":50", "\"quantity\":0"));
        assertEquals("Quantity must be at least 1", zero.getMessage());

        verify(donations, never()).create(any(User.class), any(), any());
    }

    @Test
    void unparseableQuantityIsSpeakable() {
        ApiException e = rejected(body("\"title\":\"Rice\"", SAFE).replace("\"quantity\":50", "\"quantity\":\"lots\""));
        assertEquals(VoiceService.QUANTITY, e.getMessage());
    }

    @Test
    void malformedBodyIsSpeakable() {
        assertEquals(VoiceService.UNREADABLE, assertThrows(ApiException.class, () -> voice.read("{nope", VoiceRequests.Donation.class)).getMessage());
        assertEquals(VoiceService.UNREADABLE, assertThrows(ApiException.class, () -> voice.read(null, VoiceRequests.Lookup.class)).getMessage());
    }

    @Test
    void postsWithDefaultsAndReadsBack() {
        AtomicReference<DonationRequests.Create> sent = new AtomicReference<>();
        when(donations.create(any(User.class), any(), eq(Source.VOICE))).thenAnswer(inv -> {
            DonationRequests.Create c = inv.getArgument(1);
            sent.set(c);
            DonationDto dto = mock(DonationDto.class);
            when(dto.code()).thenReturn("RS-2500");
            when(dto.quantity()).thenReturn(c.quantity());
            when(dto.title()).thenReturn(c.title());
            when(dto.pickupUntil()).thenReturn(c.pickupUntil());
            return dto;
        });

        VoiceRequests.Posted posted = voice.post(voice.read(
                body("\"title\":\"Chicken Biryani\",\"category\":\"None\",\"note\":\"\"", SAFE).replace("\"veg\"", "\"non veg\""),
                VoiceRequests.Donation.class));

        assertEquals(Diet.NON_VEG, sent.get().diet());
        assertEquals(Category.COOKED, sent.get().category());
        assertEquals(Unit.SERVINGS, sent.get().unit());
        assertEquals("12 Rajaji Street", sent.get().address());
        assertEquals(null, sent.get().note());
        assertEquals("RS-2500", posted.code());
        assertTrue(posted.message().startsWith("Done. RS-2500, 50 servings of chicken biryani, is live. Pickup by "));
    }

    @Test
    void choiceParsesSpokenEnumsAndDefaults() {
        assertEquals(Diet.NON_VEG, VoiceService.choice(Diet.class, "non veg", null, "diet", "m"));
        assertEquals(Diet.NON_VEG, VoiceService.choice(Diet.class, "Non-Veg", null, "diet", "m"));
        assertEquals(Category.FRUIT_VEG, VoiceService.choice(Category.class, "fruit veg", Category.COOKED, "category", "m"));
        assertEquals(Unit.SERVINGS, VoiceService.choice(Unit.class, "None", Unit.SERVINGS, "unit", "m"));
        assertEquals("m", assertThrows(ApiException.class, () -> VoiceService.choice(Diet.class, "", null, "diet", "m")).getMessage());
        assertEquals("m", assertThrows(ApiException.class, () -> VoiceService.choice(Unit.class, "litres", Unit.SERVINGS, "unit", "m")).getMessage());
    }

    @Test
    void blankCoversTemplatePlaceholders() {
        for (String s : new String[] {null, "", "  ", "None", "null", " NULL "}) {
            assertTrue(VoiceService.blank(s), String.valueOf(s));
        }
        assertFalse(VoiceService.blank("Rice"));
    }

    @Test
    void secretGate() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class, () -> voice.checkSecret("wrong")).status());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ApiException.class, () -> voice.checkSecret(null)).status());
        voice.checkSecret("s3cret");
        VoiceService off = new VoiceService("", "Asia/Kolkata", users, donations, null, new ObjectMapper());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ApiException.class, () -> off.checkSecret("s3cret")).status());
    }
}
