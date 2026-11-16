package com.reserve.voice;

final class VoicePhone {

    private VoicePhone() {
    }

    // Keeps the last 10 digits, which drops a +91, 91 or leading 0; null when too short
    static String normalize(String raw) {
        String digits = raw == null ? "" : raw.replaceAll("\\D", "");
        return digits.length() < 10 ? null : digits.substring(digits.length() - 10);
    }
}
