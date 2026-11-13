package com.reserve.user;

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
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String name;
    private String phone;

    @Column(name = "password_hash")
    private String passwordHash;

    private String orgType;
    private String vehicle;
    private String address;
    private double lat;
    private double lng;
    private boolean verified;
    private boolean onDuty = true;
    private boolean acceptingFood = true;

    @ManyToOne
    @JoinColumn(name = "drop_ngo_id")
    private User dropNgo;

    private BigDecimal rating = new BigDecimal("4.8");
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected User() {
    }

    public User(Role role, String name, String phone, String passwordHash, String address, double lat, double lng) {
        this.role = role;
        this.name = name;
        this.phone = phone;
        this.passwordHash = passwordHash;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
    }

    // "Priya S." becomes "PS", "Hope Kitchen Trust" becomes "HK"
    public String initials() {
        StringBuilder sb = new StringBuilder();
        for (String part : name.trim().split("\\s+")) {
            if (!part.isEmpty() && Character.isLetter(part.charAt(0))) {
                sb.append(Character.toUpperCase(part.charAt(0)));
            }
            if (sb.length() == 2) {
                break;
            }
        }
        return sb.toString();
    }

    public Long getId() { return id; }
    public Role getRole() { return role; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public String getPasswordHash() { return passwordHash; }
    public String getOrgType() { return orgType; }
    public void setOrgType(String orgType) { this.orgType = orgType; }
    public String getVehicle() { return vehicle; }
    public void setVehicle(String vehicle) { this.vehicle = vehicle; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }
    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public boolean isOnDuty() { return onDuty; }
    public void setOnDuty(boolean onDuty) { this.onDuty = onDuty; }
    public boolean isAcceptingFood() { return acceptingFood; }
    public void setAcceptingFood(boolean acceptingFood) { this.acceptingFood = acceptingFood; }
    public User getDropNgo() { return dropNgo; }
    public void setDropNgo(User dropNgo) { this.dropNgo = dropNgo; }
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
