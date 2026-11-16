package com.reserve.push;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Donation;
import com.reserve.donation.Status;
import com.reserve.donation.Unit;
import com.reserve.user.Role;
import com.reserve.user.User;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

class PushTargetingTest {

    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-16T19:00:00+05:30");
    private static final double LAT = 12.9000;
    private static final double LNG = 80.2000;

    private static User user(Role role, String name, double northKm) {
        return new User(role, name, "98401000" + name.length(), "x", "Somewhere", LAT + northKm / 111.2, LNG);
    }

    private static Donation donation(int minutesLeft) {
        User donor = user(Role.DONOR, "Kalyan Mahal", 0);
        Donation d = new Donation(donor, "Veg biryani", Diet.VEG, Category.COOKED, 40, Unit.SERVINGS);
        d.setLocation("12 Rajaji Street", LAT, LNG);
        d.setBestBefore(NOW.plusMinutes(minutesLeft));
        d.setPickupUntil(NOW.plusMinutes(minutesLeft - 30));
        return d;
    }

    private static List<String> names(List<PushTargeting.Delivery> deliveries) {
        return deliveries.stream().map(x -> x.user().getName()).toList();
    }

    @Test
    void criticalFoodGoesToNearbyKitchensTakingFood() {
        User near = user(Role.NGO, "Hope Kitchen", 2.1);
        User paused = user(Role.NGO, "Paused Kitchen", 1);
        paused.setAcceptingFood(false);
        User far = user(Role.NGO, "Far Kitchen", 7.5);
        User volunteer = user(Role.VOLUNTEER, "Arun", 1);

        List<PushTargeting.Delivery> out = PushTargeting.created(donation(130 - 20), List.of(near, paused, far, volunteer), NOW, ZONE);

        assertEquals(List.of("Hope Kitchen"), names(out));
        assertEquals(new PushMessage("Critical food nearby", "40 servings of veg biryani, 2.1 km away, best before 8:50 pm", "/ngo"),
                out.get(0).message());
    }

    @Test
    void foodWithTwoHoursOrMoreLeftSendsNothing() {
        User near = user(Role.NGO, "Hope Kitchen", 1);
        assertTrue(PushTargeting.created(donation(120), List.of(near), NOW, ZONE).isEmpty());
        assertEquals(1, PushTargeting.created(donation(119), List.of(near), NOW, ZONE).size());
    }

    @Test
    void acceptedFoodGoesToNearbyOnDutyVolunteers() {
        Donation d = donation(180);
        d.setNgo(user(Role.NGO, "Hope Kitchen", 3));
        d.setStatus(Status.ACCEPTED);
        User onDuty = user(Role.VOLUNTEER, "Arun", 0.5);
        User offDuty = user(Role.VOLUNTEER, "Meena", 0.5);
        offDuty.setOnDuty(false);
        User far = user(Role.VOLUNTEER, "Ravi", 9);

        List<PushTargeting.Delivery> out = PushTargeting.accepted(d, List.of(onDuty, offDuty, far), ZONE);

        assertEquals(List.of("Kalyan Mahal", "Arun"), names(out));
        assertEquals(new PushMessage("A kitchen accepted your food", "Hope Kitchen is taking 40 servings of veg biryani", "/donor"),
                out.get(0).message());
        assertEquals(new PushMessage("Pickup needed", "40 servings of veg biryani for Hope Kitchen, 0.5 km away, pick up by 9:30 pm", "/volunteer"),
                out.get(1).message());
    }

    @Test
    void donorHearsAboutAcceptanceEvenWithNoVolunteersNearby() {
        Donation d = donation(180);
        d.setNgo(user(Role.NGO, "Hope Kitchen", 3));
        d.setStatus(Status.ACCEPTED);
        assertEquals(List.of("Kalyan Mahal"), names(PushTargeting.accepted(d, List.of(), ZONE)));
    }

    @Test
    void foodNoLongerOpenSendsNothing() {
        Donation taken = donation(60);
        taken.setStatus(Status.ACCEPTED);
        assertTrue(PushTargeting.created(taken, List.of(user(Role.NGO, "Hope Kitchen", 1)), NOW, ZONE).isEmpty());
        assertTrue(PushTargeting.accepted(donation(60), List.of(user(Role.VOLUNTEER, "Arun", 1)), ZONE).isEmpty());
    }
}
