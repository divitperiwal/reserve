package com.reserve.donation;

public enum Status {
    AVAILABLE, ACCEPTED, CLAIMED, PICKED_UP, DELIVERED, EXPIRED, CANCELLED;

    // Still listed: waiting for a kitchen (AVAILABLE) or for a volunteer (ACCEPTED)
    public boolean isOpen() {
        return this == AVAILABLE || this == ACCEPTED;
    }

    public boolean isActiveRun() {
        return this == CLAIMED || this == PICKED_UP;
    }
}
