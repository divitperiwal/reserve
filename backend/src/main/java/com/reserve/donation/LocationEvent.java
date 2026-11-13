package com.reserve.donation;

import java.time.OffsetDateTime;

public record LocationEvent(Long donationId, double lat, double lng, OffsetDateTime at) {
}
