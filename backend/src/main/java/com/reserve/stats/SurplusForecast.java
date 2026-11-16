package com.reserve.stats;

import com.reserve.donation.Donation;
import com.reserve.donation.Status;
import com.reserve.stats.StatsDtos.ForecastEntry;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

final class SurplusForecast {

    static final int WEEKS_LOOKED = 8;
    private static final int MIN_WEEKS = 2;
    private static final int SLOT_HOURS = 3;
    private static final int LIMIT = 6;

    private static final Comparator<ForecastEntry> SOONEST =
            Comparator.comparing(ForecastEntry::from).thenComparing(ForecastEntry::donorId);

    private record Key(Long donorId, DayOfWeek day, int slot) {
    }

    private SurplusForecast() {
    }

    static List<ForecastEntry> forecast(Collection<Donation> donations, OffsetDateTime now, ZoneId zone) {
        OffsetDateTime since = now.minusWeeks(WEEKS_LOOKED);
        Map<Key, List<Donation>> groups = donations.stream()
                .filter(d -> d.getStatus() != Status.CANCELLED)
                .filter(d -> !d.getPickupFrom().isBefore(since) && d.getPickupFrom().isBefore(now))
                .collect(Collectors.groupingBy(d -> key(d, zone)));
        return groups.entrySet().stream()
                .map(e -> entry(e.getKey(), e.getValue(), now, zone))
                .filter(e -> e.weeksSeen() >= MIN_WEEKS)
                .sorted(Comparator.comparingInt(ForecastEntry::expectedMeals).reversed().thenComparing(SOONEST))
                .limit(LIMIT)
                .sorted(SOONEST)
                .toList();
    }

    private static Key key(Donation d, ZoneId zone) {
        ZonedDateTime at = d.getPickupFrom().atZoneSameInstant(zone);
        return new Key(d.getDonor().getId(), at.getDayOfWeek(), at.getHour() / SLOT_HOURS);
    }

    private static ForecastEntry entry(Key key, List<Donation> group, OffsetDateTime now, ZoneId zone) {
        Set<LocalDate> weeks = group.stream()
                .map(d -> d.getPickupFrom().atZoneSameInstant(zone).toLocalDate()
                        .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)))
                .collect(Collectors.toSet());
        Donation latest = group.stream().max(Comparator.comparing(Donation::getPickupFrom)).orElseThrow();
        int expectedMeals = (int) Math.round((double) StatsService.meals(group) / weeks.size());
        ZonedDateTime from = nextSlotStart(key, now.atZoneSameInstant(zone));
        return new ForecastEntry(key.donorId(), latest.getDonor().getName(), latest.getAddress(), latest.getLat(),
                latest.getLng(), from.toOffsetDateTime(), from.plusHours(SLOT_HOURS).toOffsetDateTime(),
                expectedMeals, Math.min(weeks.size(), WEEKS_LOOKED), WEEKS_LOOKED);
    }

    private static ZonedDateTime nextSlotStart(Key key, ZonedDateTime now) {
        LocalDate date = now.toLocalDate().with(TemporalAdjusters.nextOrSame(key.day()));
        ZonedDateTime start = date.atTime(key.slot() * SLOT_HOURS, 0).atZone(now.getZone());
        return start.isAfter(now) ? start : start.plusWeeks(1);
    }
}
