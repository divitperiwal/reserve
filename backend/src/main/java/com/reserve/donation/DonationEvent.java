package com.reserve.donation;

public record DonationEvent(Type type, Long donationId) {

    public enum Type { CREATED, ACCEPTED }
}
