package com.reserve.activity;

import com.reserve.donation.Donation;
import com.reserve.user.User;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ActivityType type;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @ManyToOne(optional = false)
    @JoinColumn(name = "donation_id")
    private Donation donation;

    private OffsetDateTime createdAt;

    protected Activity() {
    }

    public Activity(ActivityType type, User actor, Donation donation, OffsetDateTime createdAt) {
        this.type = type;
        this.actor = actor;
        this.donation = donation;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public ActivityType getType() { return type; }
    public User getActor() { return actor; }
    public Donation getDonation() { return donation; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
