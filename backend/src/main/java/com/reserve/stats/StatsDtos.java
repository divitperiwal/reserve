package com.reserve.stats;

import com.reserve.donation.Category;
import com.reserve.donation.Status;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class StatsDtos {

    private StatsDtos() {
    }

    public record PublicStats(int mealsRescued, double foodKg, double co2Kg, long activeVolunteers, long partnerNgos,
                              long livePickups, int medianPickupMinutes, int deliveredBeforeExpiryPct) {
    }

    public record NextBadge(String name, int current, int target) {
    }

    public record AllTime(int count, int meals, double foodKg, double co2Kg, OffsetDateTime since) {
    }

    public record MyStats(String monthLabel, int pickups, int meals, Integer rank, Integer donations, Long live,
                          NextBadge nextBadge, AllTime allTime, List<String> earnedBadges) {
    }

    public record DayMeals(LocalDate date, int meals) {
    }

    public record Funnel(long posted, long claimed, long pickedUp, long delivered, long expired) {
    }

    public record CategoryShare(Category category, int pct) {
    }

    public record TopVolunteer(Long id, String name, String initials, int pickups, int meals) {
    }

    public record DashboardStats(int days, int mealsRescued, int mealsDeltaPct, double foodKg, double foodDeltaKg,
                                 int medianPickupMinutes, int medianDeltaMinutes, int deliveredBeforeExpiryPct,
                                 List<DayMeals> perDay, Funnel funnel, List<CategoryShare> categories,
                                 List<TopVolunteer> topVolunteers, double co2Kg) {
    }

    public record LeaderVolunteer(Long id, String name, String initials, int pickups, int meals, String badge) {
    }

    public record LeaderDonor(Long id, String name, String initials, int donations, int meals) {
    }

    public record Leaderboard(int days, int meals, double foodKg, double co2Kg, List<LeaderVolunteer> volunteers,
                              List<LeaderDonor> donors) {
    }

    public record SurplusPoint(double lat, double lng, double kg, Status status) {
    }

    public record ForecastEntry(Long donorId, String donorName, String address, double lat, double lng,
                                OffsetDateTime from, OffsetDateTime until, int expectedMeals, int weeksSeen,
                                int weeksLooked) {
    }

    public record SurplusMap(int days, List<SurplusPoint> points, List<ForecastEntry> forecast) {
    }
}
