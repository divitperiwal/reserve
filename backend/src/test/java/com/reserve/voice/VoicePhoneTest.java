package com.reserve.voice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class VoicePhoneTest {

    @ParameterizedTest
    @ValueSource(strings = {"9840100001", "+91 98401 00001", "+91-98401-00001", "919840100001", "09840100001", " 98401 00001 "})
    void keepsTheLastTenDigits(String raw) {
        assertEquals("9840100001", VoicePhone.normalize(raw));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "98401", "phone"})
    void tooShortIsNull(String raw) {
        assertNull(VoicePhone.normalize(raw));
    }
}
