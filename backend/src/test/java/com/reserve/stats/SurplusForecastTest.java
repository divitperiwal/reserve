package com.reserve.stats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Donation;
import com.reserve.donation.Status;
import com.reserve.donation.Unit;
import com.reserve.stats.StatsDtos.ForecastEntry;
import com.reserve.user.Role;
import com.reserve.user.User;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class SurplusForecastTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-18T10:00:00+05:30");

    private static User donor(long id, String name) {
        User u = new User(Role.DONOR, name, "98" + id, "x", "Road " + id, 12.9, 77.6);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private static Donation donation(User donor, String pickupFrom, int meals, Status status) {
        Donation d = new Donation(donor, "Food", Diet.VEG, Category.COOKED, meals, Unit.SERVINGS);
        d.setLocation(donor.getAddress(), 12.9, 77.6);
        d.setPickupFrom(OffsetDateTime.parse(pickupFrom));
        d.setStatus(status);
        return d;
    }

    @Test
    void groupsByDonorWeekdayAndSlotAndProjectsTheNextOccurrence() {
        User a = donor(1, "Annapurna Kitchen");
        List<Donation> history = List.of(
                donation(a, "2026-11-16T18:30:00+05:30", 30, Status.DELIVERED),
                donation(a, "2026-11-09T19:00:00+05:30", 40, Status.EXPIRED),
                donation(a, "2026-11-02T18:00:00+05:30", 50, Status.DELIVERED),
                donation(a, "2026-11-02T20:00:00+05:30", 10, Status.DELIVERED));

        List<ForecastEntry> out = SurplusForecast.forecast(history, NOW, ZONE);

        assertEquals(1, out.size());
        ForecastEntry e = out.get(0);
        assertEquals(OffsetDateTime.parse("2026-11-23T18:00:00+05:30"), e.from());
        assertEquals(OffsetDateTime.parse("2026-11-23T21:00:00+05:30"), e.until());
        assertEquals(3, e.weeksSeen());
        assertEquals(8, e.weeksLooked());
        assertEquals(43, e.expectedMeals());
        assertEquals("Annapurna Kitchen", e.donorName());
    }

    @Test
    void ignoresCancelledSingleWeekAndOlderThanEightWeeks() {
        User b = donor(2, "Bakery");
        List<Donation> history = List.of(
                donation(b, "2026-11-16T09:00:00+05:30", 20, Status.DELIVERED),
                donation(b, "2026-11-09T09:00:00+05:30", 20, Status.CANCELLED),
                donation(b, "2026-09-14T09:00:00+05:30", 20, Status.DELIVERED));

        assertTrue(SurplusForecast.forecast(history, NOW, ZONE).isEmpty());
    }

    @Test
    void returnsSixSoonestFirst() {
        List<Donation> history = new ArrayList<>();
        for (long id = 1; id <= 8; id++) {
            User u = donor(id, "Donor " + id);
            String time = "T" + String.format("%02d", id + 3) + ":00:00+05:30";
            history.add(donation(u, "2026-11-16" + time, 10, Status.DELIVERED));
            history.add(donation(u, "2026-11-09" + time, 10, Status.DELIVERED));
        }

        List<ForecastEntry> out = SurplusForecast.forecast(history, NOW, ZONE);

        assertEquals(6, out.size());
        assertEquals(1L, out.get(0).donorId());
        assertEquals(6L, out.get(5).donorId());
    }
}
