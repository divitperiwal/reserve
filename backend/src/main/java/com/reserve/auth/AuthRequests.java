package com.reserve.auth;

import com.reserve.user.Role;
import com.reserve.user.UserDto;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AuthRequests {

    private AuthRequests() {
    }

    public record Register(
            @NotNull(message = "Choose a role") Role role,
            @NotBlank(message = "Enter your name") @Size(max = 120, message = "Name is too long") String name,
            @NotBlank(message = "Enter your phone number") String phone,
            @NotBlank(message = "Enter a password") @Size(min = 6, message = "Use at least 6 characters") String password,
            @Size(max = 60, message = "Too long") String orgType,
            @Size(max = 60, message = "Too long") String vehicle,
            @NotBlank(message = "Enter an address") String address,
            @NotNull(message = "Pick a location") @DecimalMin(value = "-90", message = "Invalid latitude") @DecimalMax(value = "90", message = "Invalid latitude") Double lat,
            @NotNull(message = "Pick a location") @DecimalMin(value = "-180", message = "Invalid longitude") @DecimalMax(value = "180", message = "Invalid longitude") Double lng) {
    }

    public record Login(
            @NotBlank(message = "Enter your phone number") String phone,
            @NotBlank(message = "Enter your password") String password) {
    }

    public record OtpRequest(@NotBlank(message = "Enter your phone number") String phone) {
    }

    public record OtpVerify(
            @NotBlank(message = "Enter your phone number") String phone,
            @NotBlank(message = "Enter the code") String code) {
    }

    public record AuthResponse(String token, UserDto user) {
    }

    public record OtpSent(boolean sent, String devCode) {
    }
}
