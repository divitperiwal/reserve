package com.reserve.stats;

import com.reserve.auth.AuthUser;
import com.reserve.donation.Donation;
import com.reserve.donation.DonationRepository;
import com.reserve.donation.Status;
import com.reserve.stats.StatsDtos.CategoryShare;
import com.reserve.stats.StatsDtos.DashboardStats;
import com.reserve.stats.StatsDtos.DayMeals;
import com.reserve.stats.StatsDtos.Funnel;
import com.reserve.stats.StatsDtos.MyStats;
import com.reserve.stats.StatsDtos.NextBadge;
import com.reserve.stats.StatsDtos.PublicStats;
import com.reserve.stats.StatsDtos.TopVolunteer;
import com.reserve.user.Role;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StatsService {

    private static final double CO2_PER_KG = 2.5;
    private static final List<NextBadge> BADGES = List.of(
            new NextBadge("Bronze", 0, 5), new NextBadge("Silver", 0, 10),
            new NextBadge("Gold Rescuer", 0, 20), new NextBadge("Platinum", 0, 40));

    private final DonationRepository donations;
    private final UserRepository users;
    private final ZoneId zone;

    public StatsService(DonationRepository donations, UserRepository users, @Value("${app.zone}") String zone) {
        this.donations = donations;
        this.users = users;
        this.zone = ZoneId.of(zone);
    }

    @Transactional(readOnly = true)
    public PublicStats publicStats() {
        List<Donation> delivered = donations.findByStatus(Status.DELIVERED);
        double kg = kg(delivered);
        return new PublicStats(meals(delivered), round1(kg), round1(kg * CO2_PER_KG),
                users.countByRoleAndOnDutyTrue(Role.VOLUNTEER), users.countByRole(Role.NGO),
                donations.countByStatusIn(EnumSet.of(Status.CLAIMED, Status.PICKED_UP)),
                medianPickupMinutes(delivered), onTimePct(delivered));
    }

    @Transactional(readOnly = true)
    public MyStats myStats(AuthUser me) {
        OffsetDateTime monthStart = LocalDate.now(zone).withDayOfMonth(1).atStartOfDay(zone).toOffsetDateTime();
        String monthLabel = monthStart.atZoneSameInstant(zone).getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        List<Donation> pickedThisMonth = donations.findByPickedUpAtAfter(monthStart);
        return switch (me.role()) {
            case VOLUNTEER -> volunteerStats(me.id(), monthLabel, pickedThisMonth);
            case DONOR -> {
                List<Donation> mine = donations.findByDonorIdAndCreatedAtAfter(me.id(), monthStart.minusDays(2));
                List<Donation> deliveredThisMonth = mine.stream().filter(deliveredSince(monthStart)).toList();
                int posted = (int) mine.stream().filter(d -> !d.getCreatedAt().isBefore(monthStart)).count();
                int pickups = (int) pickedThisMonth.stream().filter(d -> d.getDonor().getId().equals(me.id())).count();
                long live = donations.countByDonorIdAndStatusIn(me.id(), EnumSet.of(Status.AVAILABLE, Status.ACCEPTED, Status.CLAIMED, Status.PICKED_UP));
                yield new MyStats(monthLabel, pickups, meals(deliveredThisMonth), null, posted, live, null);
            }
            case NGO -> {
                List<Donation> received = pickedThisMonth.stream()
                        .filter(d -> d.getNgo().getId().equals(me.id())).filter(deliveredSince(monthStart)).toList();
                yield new MyStats(monthLabel, received.size(), meals(received), null, null, null, null);
            }
        };
    }

    @Transactional(readOnly = true)
    public DashboardStats dashboard(int days) {
        LocalDate firstDay = LocalDate.now(zone).minusDays(days - 1L);
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime start = firstDay.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime prevStart = start.minusDays(days);
        List<Donation> all = donations.findByCreatedAtAfter(prevStart.minusDays(2));

        List<Donation> delivered = filter(all, d -> within(d.getDeliveredAt(), start, now));
        List<Donation> prevDelivered = filter(all, d -> within(d.getDeliveredAt(), prevStart, start));
        List<Donation> picked = filter(all, d -> within(d.getPickedUpAt(), start, now));
        List<Donation> prevPicked = filter(all, d -> within(d.getPickedUpAt(), prevStart, start));
        List<Donation> posted = filter(all, d -> within(d.getCreatedAt(), start, now));

        int meals = meals(delivered);
        int prevMeals = meals(prevDelivered);
        int mealsDeltaPct = prevMeals == 0 ? (meals > 0 ? 100 : 0) : Math.round((meals - prevMeals) * 100f / prevMeals);
        double kg = kg(delivered);
        int median = medianPickupMinutes(picked);

        Map<LocalDate, Integer> mealsByDay = delivered.stream().collect(Collectors.groupingBy(
                d -> d.getDeliveredAt().atZoneSameInstant(zone).toLocalDate(), Collectors.summingInt(Donation::meals)));
        List<DayMeals> perDay = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate day = firstDay.plusDays(i);
            perDay.add(new DayMeals(day, mealsByDay.getOrDefault(day, 0)));
        }

        Funnel funnel = new Funnel(posted.size(),
                posted.stream().filter(d -> d.getClaimedAt() != null).count(),
                posted.stream().filter(d -> d.getPickedUpAt() != null).count(),
                posted.stream().filter(d -> d.getStatus() == Status.DELIVERED).count(),
                posted.stream().filter(d -> d.getStatus() == Status.EXPIRED).count());

        List<CategoryShare> categories = delivered.stream()
                .collect(Collectors.groupingBy(Donation::getCategory, Collectors.counting()))
                .entrySet().stream()
                .map(e -> new CategoryShare(e.getKey(), Math.round(e.getValue() * 100f / delivered.size())))
                .sorted(Comparator.comparingInt(CategoryShare::pct).reversed())
                .toList();

        return new DashboardStats(days, meals, mealsDeltaPct, round1(kg), round1(kg - kg(prevDelivered)),
                median, median - medianPickupMinutes(prevPicked), onTimePct(delivered), perDay, funnel, categories,
                topVolunteers(delivered), round1(kg * CO2_PER_KG));
    }

    @Transactional(readOnly = true)
    public String exportCsv(int days) {
        OffsetDateTime start = LocalDate.now(zone).minusDays(days - 1L).atStartOfDay(zone).toOffsetDateTime();
        return CsvExport.write(donations.findByCreatedAtAfter(start).stream()
                .sorted(Comparator.comparing(Donation::getCreatedAt)).toList());
    }

    private MyStats volunteerStats(Long me, String monthLabel, List<Donation> pickedThisMonth) {
        Map<Long, Integer> mealsByVolunteer = pickedThisMonth.stream()
                .collect(Collectors.groupingBy(d -> d.getVolunteer().getId(), Collectors.summingInt(Donation::meals)));
        int pickups = (int) pickedThisMonth.stream().filter(d -> d.getVolunteer().getId().equals(me)).count();
        int meals = mealsByVolunteer.getOrDefault(me, 0);
        int rank = 1 + (int) mealsByVolunteer.values().stream().filter(m -> m > meals).count();
        NextBadge next = BADGES.stream().filter(b -> pickups < b.target()).findFirst()
                .map(b -> new NextBadge(b.name(), pickups, b.target())).orElse(null);
        return new MyStats(monthLabel, pickups, meals, rank, null, null, next);
    }

    private static List<TopVolunteer> topVolunteers(List<Donation> delivered) {
        Map<User, List<Donation>> byVolunteer = delivered.stream()
                .collect(Collectors.groupingBy(Donation::getVolunteer, Collectors.toList()));
        return byVolunteer.entrySet().stream()
                .map(e -> new TopVolunteer(e.getKey().getId(), e.getKey().getName(), e.getKey().initials(),
                        e.getValue().size(), meals(e.getValue())))
                .sorted(Comparator.comparingInt(TopVolunteer::meals).reversed())
                .limit(5)
                .toList();
    }

    private static Predicate<Donation> deliveredSince(OffsetDateTime from) {
        return d -> d.getStatus() == Status.DELIVERED && !d.getDeliveredAt().isBefore(from);
    }

    private static boolean within(OffsetDateTime t, OffsetDateTime from, OffsetDateTime to) {
        return t != null && !t.isBefore(from) && t.isBefore(to);
    }

    private static List<Donation> filter(List<Donation> list, Predicate<Donation> p) {
        return list.stream().filter(p).toList();
    }

    static int meals(Collection<Donation> list) {
        return list.stream().mapToInt(Donation::meals).sum();
    }

    static double kg(Collection<Donation> list) {
        return list.stream().map(Donation::getWeightKg).reduce(BigDecimal.ZERO, BigDecimal::add).doubleValue();
    }

    // Minutes from posting to pickup, median over donations that were picked up
    static int medianPickupMinutes(Collection<Donation> list) {
        List<Long> minutes = list.stream().filter(d -> d.getPickedUpAt() != null)
                .map(d -> Duration.between(d.getCreatedAt(), d.getPickedUpAt()).toMinutes()).sorted().toList();
        if (minutes.isEmpty()) {
            return 0;
        }
        int mid = minutes.size() / 2;
        return minutes.size() % 2 == 1 ? minutes.get(mid).intValue() : (int) Math.round((minutes.get(mid - 1) + minutes.get(mid)) / 2.0);
    }

    static int onTimePct(Collection<Donation> list) {
        List<Donation> delivered = list.stream().filter(d -> d.getDeliveredAt() != null).toList();
        if (delivered.isEmpty()) {
            return 0;
        }
        long onTime = delivered.stream().filter(d -> !d.getDeliveredAt().isAfter(d.getBestBefore())).count();
        return Math.round(onTime * 100f / delivered.size());
    }

    static double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
