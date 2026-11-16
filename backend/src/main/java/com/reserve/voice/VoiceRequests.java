package com.reserve.voice;

public final class VoiceRequests {

    private VoiceRequests() {
    }

    public record Lookup(String phone) {
    }

    public record Donation(
            String phone, String title, String diet, String category, Integer quantity, String unit,
            String pickupFrom, String pickupUntil, String bestBefore,
            Boolean covered, Boolean safeTemp, Boolean noReturns, Boolean allergensNoted, String note) {
    }

    public record LookupResult(boolean registered, String name, String address) {
    }

    public record Posted(String code, String message) {
    }
}
