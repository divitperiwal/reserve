package com.reserve.donation;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "location_pings")
public class LocationPing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long donationId;
    private double lat;
    private double lng;
    private OffsetDateTime recordedAt;

    protected LocationPing() {
    }

    public LocationPing(Long donationId, double lat, double lng, OffsetDateTime recordedAt) {
        this.donationId = donationId;
        this.lat = lat;
        this.lng = lng;
        this.recordedAt = recordedAt;
    }

    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public OffsetDateTime getRecordedAt() { return recordedAt; }
}
