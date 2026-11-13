package com.reserve.auth;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "otp_codes")
public class OtpCode {

    @Id
    private String phone;
    private String code;
    private OffsetDateTime expiresAt;

    protected OtpCode() {
    }

    public OtpCode(String phone, String code, OffsetDateTime expiresAt) {
        this.phone = phone;
        this.code = code;
        this.expiresAt = expiresAt;
    }

    public boolean matches(String candidate) {
        return code.equals(candidate) && expiresAt.isAfter(OffsetDateTime.now());
    }

    public String getPhone() { return phone; }
}
