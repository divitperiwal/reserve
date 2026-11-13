package com.reserve.donation;

import com.reserve.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "donations")
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "donor_id")
    private User donor;

    private String title;

    @Enumerated(EnumType.STRING)
    private Diet diet;

    @Enumerated(EnumType.STRING)
    private Category category;

    private int quantity;

    @Enumerated(EnumType.STRING)
    private Unit unit;

    private BigDecimal weightKg;
    private Integer containers;
    private String photoUrl;
    private String note;
    private String address;
    private double lat;
    private double lng;
    private OffsetDateTime preparedAt;
    private OffsetDateTime bestBefore;
    private OffsetDateTime pickupFrom;
    private OffsetDateTime pickupUntil;
    private String safetyChecks;

    @Enumerated(EnumType.STRING)
    private Status status = Status.AVAILABLE;

    @ManyToOne
    @JoinColumn(name = "volunteer_id")
    private User volunteer;

    @ManyToOne
    @JoinColumn(name = "ngo_id")
    private User ngo;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 4)
    private String pickupCode;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 4)
    private String dropCode;

    private OffsetDateTime claimedAt;
    private OffsetDateTime pickedUpAt;
    private OffsetDateTime deliveredAt;
    private Double curLat;
    private Double curLng;
    private OffsetDateTime locAt;
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Version
    private long version;

    protected Donation() {
    }

    public Donation(User donor, String title, Diet diet, Category category, int quantity, Unit unit) {
        this.donor = donor;
        this.title = title;
        this.diet = diet;
        this.category = category;
        this.quantity = quantity;
        this.unit = unit;
        this.weightKg = unit.weightKg(quantity);
    }

    // Carves part of this listing into a new one with its own handover codes; this one keeps the rest
    public Donation split(int part) {
        Donation d = new Donation(donor, title, diet, category, part, unit);
        if (weightKg != null) {
            d.weightKg = weightKg.multiply(BigDecimal.valueOf(part)).divide(BigDecimal.valueOf(quantity), 2, java.math.RoundingMode.HALF_UP);
            weightKg = weightKg.subtract(d.weightKg);
        }
        if (containers != null) {
            d.containers = Math.max(1, Math.round((float) containers * part / quantity));
            containers = Math.max(1, containers - d.containers);
        }
        d.photoUrl = photoUrl;
        d.note = note;
        d.address = address;
        d.lat = lat;
        d.lng = lng;
        d.preparedAt = preparedAt;
        d.bestBefore = bestBefore;
        d.pickupFrom = pickupFrom;
        d.pickupUntil = pickupUntil;
        d.safetyChecks = safetyChecks;
        d.createdAt = createdAt;
        d.pickupCode = DonationService.handoverCode();
        d.dropCode = DonationService.handoverCode();
        quantity -= part;
        return d;
    }

    public String code() {
        return "RS-" + (2400 + id);
    }

    public int meals() {
        return unit.meals(quantity);
    }

    public String quantityLabel() {
        return unit.label(quantity);
    }

    public List<SafetyCheck> safetyCheckList() {
        if (safetyChecks == null || safetyChecks.isBlank()) {
            return List.of();
        }
        return Arrays.stream(safetyChecks.split(",")).map(SafetyCheck::valueOf).toList();
    }

    public void setSafetyCheckList(Collection<SafetyCheck> checks) {
        this.safetyChecks = checks.stream().distinct().map(Enum::name).collect(Collectors.joining(","));
    }

    public boolean isParty(Long userId) {
        return donor.getId().equals(userId)
                || (volunteer != null && volunteer.getId().equals(userId))
                || (ngo != null && ngo.getId().equals(userId));
    }

    public Long getId() { return id; }
    public User getDonor() { return donor; }
    public String getTitle() { return title; }
    public Diet getDiet() { return diet; }
    public Category getCategory() { return category; }
    public int getQuantity() { return quantity; }
    public Unit getUnit() { return unit; }
    public BigDecimal getWeightKg() { return weightKg; }
    public void setWeightKg(BigDecimal weightKg) { this.weightKg = weightKg; }
    public Integer getContainers() { return containers; }
    public void setContainers(Integer containers) { this.containers = containers; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getAddress() { return address; }
    public double getLat() { return lat; }
    public double getLng() { return lng; }
    public void setLocation(String address, double lat, double lng) {
        this.address = address;
        this.lat = lat;
        this.lng = lng;
    }
    public OffsetDateTime getPreparedAt() { return preparedAt; }
    public void setPreparedAt(OffsetDateTime preparedAt) { this.preparedAt = preparedAt; }
    public OffsetDateTime getBestBefore() { return bestBefore; }
    public void setBestBefore(OffsetDateTime bestBefore) { this.bestBefore = bestBefore; }
    public OffsetDateTime getPickupFrom() { return pickupFrom; }
    public void setPickupFrom(OffsetDateTime pickupFrom) { this.pickupFrom = pickupFrom; }
    public OffsetDateTime getPickupUntil() { return pickupUntil; }
    public void setPickupUntil(OffsetDateTime pickupUntil) { this.pickupUntil = pickupUntil; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public User getVolunteer() { return volunteer; }
    public void setVolunteer(User volunteer) { this.volunteer = volunteer; }
    public User getNgo() { return ngo; }
    public void setNgo(User ngo) { this.ngo = ngo; }
    public String getPickupCode() { return pickupCode; }
    public void setPickupCode(String pickupCode) { this.pickupCode = pickupCode; }
    public String getDropCode() { return dropCode; }
    public void setDropCode(String dropCode) { this.dropCode = dropCode; }
    public OffsetDateTime getClaimedAt() { return claimedAt; }
    public void setClaimedAt(OffsetDateTime claimedAt) { this.claimedAt = claimedAt; }
    public OffsetDateTime getPickedUpAt() { return pickedUpAt; }
    public void setPickedUpAt(OffsetDateTime pickedUpAt) { this.pickedUpAt = pickedUpAt; }
    public OffsetDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(OffsetDateTime deliveredAt) { this.deliveredAt = deliveredAt; }
    public Double getCurLat() { return curLat; }
    public Double getCurLng() { return curLng; }
    public OffsetDateTime getLocAt() { return locAt; }
    public void setCurrentLocation(Double lat, Double lng, OffsetDateTime at) {
        this.curLat = lat;
        this.curLng = lng;
        this.locAt = at;
    }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
