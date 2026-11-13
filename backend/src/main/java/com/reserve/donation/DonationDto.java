package com.reserve.donation;

import com.reserve.user.NgoRef;
import com.reserve.user.PersonRef;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record DonationDto(
        Long id, String code, String title, Diet diet, Category category, int quantity, Unit unit,
        BigDecimal weightKg, Integer containers, String photoUrl, String note, String address, double lat, double lng,
        OffsetDateTime preparedAt, OffsetDateTime bestBefore, OffsetDateTime pickupFrom, OffsetDateTime pickupUntil,
        List<SafetyCheck> safetyChecks, Status status, PersonRef donor, PersonRef volunteer, NgoRef ngo,
        OffsetDateTime claimedAt, OffsetDateTime pickedUpAt, OffsetDateTime deliveredAt, OffsetDateTime createdAt,
        Double distanceKm, int meals, String pickupCode, String dropCode, GeoPoint lastLocation) {
}
