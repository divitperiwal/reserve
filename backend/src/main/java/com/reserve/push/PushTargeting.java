package com.reserve.push;

import com.reserve.donation.Donation;
import com.reserve.donation.Geo;
import com.reserve.donation.Status;
import com.reserve.user.Role;
import com.reserve.user.User;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Stream;

public final class PushTargeting {

    static final double RADIUS_KM = 7;
    static final Duration CRITICAL = Duration.ofHours(2);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    public record Delivery(User user, PushMessage message) {
    }

    private PushTargeting() {
    }

    // Food posted with under 2 hours left goes to kitchens taking food within 7 km
    public static List<Delivery> created(Donation d, List<User> ngos, OffsetDateTime now, ZoneId zone) {
        if (d.getStatus() != Status.AVAILABLE || Duration.between(now, d.getBestBefore()).compareTo(CRITICAL) >= 0) {
            return List.of();
        }
        String until = time(d.getBestBefore(), zone);
        return nearby(d, ngos, u -> u.getRole() == Role.NGO && u.isAcceptingFood(), km ->
                new PushMessage("Critical food nearby", what(d) + ", " + km + " away, best before " + until, "/ngo"));
    }

    // Food a kitchen has accepted goes to its donor and to on-duty volunteers within 7 km of the pickup
    public static List<Delivery> accepted(Donation d, List<User> volunteers, ZoneId zone) {
        if (d.getStatus() != Status.ACCEPTED || d.getNgo() == null) {
            return List.of();
        }
        String until = time(d.getPickupUntil(), zone);
        String to = d.getNgo().getName();
        Delivery donor = new Delivery(d.getDonor(),
                new PushMessage("A kitchen accepted your food", to + " is taking " + what(d), "/donor"));
        List<Delivery> riders = nearby(d, volunteers, u -> u.getRole() == Role.VOLUNTEER && u.isOnDuty(), km ->
                new PushMessage("Pickup needed", what(d) + " for " + to + ", " + km + " away, pick up by " + until, "/volunteer"));
        return Stream.concat(Stream.of(donor), riders.stream()).toList();
    }

    private static List<Delivery> nearby(Donation d, List<User> people, Predicate<User> eligible,
                                         Function<String, PushMessage> message) {
        return people.stream().filter(eligible).<Delivery>mapMulti((u, out) -> {
            double km = Geo.distanceKm(d.getLat(), d.getLng(), u.getLat(), u.getLng());
            if (km <= RADIUS_KM) {
                out.accept(new Delivery(u, message.apply(String.format(Locale.ROOT, "%.1f km", km))));
            }
        }).toList();
    }

    // "40 servings of veg biryani"; titles that start with an acronym keep their case
    private static String what(Donation d) {
        String t = d.getTitle();
        boolean acronym = t.length() > 1 && Character.isUpperCase(t.charAt(1));
        String dish = acronym ? t : Character.toLowerCase(t.charAt(0)) + t.substring(1);
        return d.getUnit().label(d.getQuantity()) + " of " + dish;
    }

    private static String time(OffsetDateTime at, ZoneId zone) {
        return at.atZoneSameInstant(zone).format(TIME).toLowerCase(Locale.ROOT);
    }
}
