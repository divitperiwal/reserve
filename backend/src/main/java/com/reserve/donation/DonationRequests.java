package com.reserve.donation;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public final class DonationRequests {

    private DonationRequests() {
    }

    public record Create(
            @NotBlank(message = "Add a title") @Size(max = 160, message = "Title is too long") String title,
            @NotNull(message = "Choose veg or non-veg") Diet diet,
            @NotNull(message = "Choose a category") Category category,
            @NotNull(message = "Enter a quantity") @Min(value = 1, message = "Quantity must be at least 1") Integer quantity,
            @NotNull(message = "Choose a unit") Unit unit,
            @DecimalMin(value = "0.01", message = "Weight must be positive") BigDecimal weightKg,
            @Min(value = 0, message = "Containers cannot be negative") Integer containers,
            @Size(max = 500, message = "Note is too long") String note,
            @NotBlank(message = "Enter the pickup address") String address,
            @NotNull(message = "Pick the pickup location") @DecimalMin(value = "-90", message = "Invalid latitude") @DecimalMax(value = "90", message = "Invalid latitude") Double lat,
            @NotNull(message = "Pick the pickup location") @DecimalMin(value = "-180", message = "Invalid longitude") @DecimalMax(value = "180", message = "Invalid longitude") Double lng,
            OffsetDateTime preparedAt,
            @NotNull(message = "Set a best-before time") OffsetDateTime bestBefore,
            @NotNull(message = "Set when pickup can start") OffsetDateTime pickupFrom,
            @NotNull(message = "Set when pickup must end") OffsetDateTime pickupUntil,
            @NotNull(message = "Confirm all safety checks") List<SafetyCheck> safetyChecks,
            String photoUrl) {
    }

    public record Accept(Integer quantity) {
    }

    public record Code(@NotBlank(message = "Enter the 4 digit code") String code) {
    }

    public record Location(
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }
}
