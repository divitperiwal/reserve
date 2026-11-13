package com.reserve.stats;

import com.reserve.donation.Category;
import java.time.LocalDate;
import java.util.List;

public final class StatsDtos {

    private StatsDtos() {
    }

    public record PublicStats(int mealsRescued, double foodKg, double co2Kg, long activeVolunteers, long partnerNgos,
                              long livePickups, int medianPickupMinutes, int deliveredBeforeExpiryPct) {
    }

    public record NextBadge(String name, int current, int target) {
    }

    public record MyStats(String monthLabel, int pickups, int meals, Integer rank, Integer donations, Long live,
                          NextBadge nextBadge) {
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
}
