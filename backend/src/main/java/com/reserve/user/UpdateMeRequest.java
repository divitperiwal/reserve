package com.reserve.user;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
        @Size(min = 2, max = 120, message = "Name must be 2 to 120 characters") String name,
        @Size(min = 3, message = "Enter an address") String address,
        @DecimalMin(value = "-90", message = "Invalid latitude") @DecimalMax(value = "90", message = "Invalid latitude") Double lat,
        @DecimalMin(value = "-180", message = "Invalid longitude") @DecimalMax(value = "180", message = "Invalid longitude") Double lng,
        @Size(max = 60, message = "Vehicle is too long") String vehicle,
        Long dropNgoId,
        Boolean onDuty,
        Boolean acceptingFood) {
}
