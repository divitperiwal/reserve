package com.reserve.donation;

public record FeedQuery(Double lat, Double lng, Double radiusKm, Double withinHours, Diet diet, Category category,
                        String sort, String q) {
}
