package com.reserve.activity;

import com.reserve.donation.Donation;
import com.reserve.user.User;
import java.time.OffsetDateTime;

public record ActivityDto(Long id, ActivityType type, String actorName, String actorInitials, Long donationId,
                          String donationTitle, String quantityLabel, String donorName, String ngoName,
                          OffsetDateTime at) {

    public static ActivityDto of(Activity a) {
        Donation d = a.getDonation();
        User actor = a.getActor() != null ? a.getActor() : d.getDonor();
        return new ActivityDto(a.getId(), a.getType(), actor.getName(), actor.initials(), d.getId(), d.getTitle(),
                d.quantityLabel(), d.getDonor().getName(), d.getNgo() == null ? null : d.getNgo().getName(),
                a.getCreatedAt());
    }
}
