package com.reserve.donation;

import java.time.OffsetDateTime;

public record GeoPoint(double lat, double lng, OffsetDateTime at) {
}
