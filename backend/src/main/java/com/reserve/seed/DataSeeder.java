package com.reserve.seed;

import com.reserve.activity.Activity;
import com.reserve.activity.ActivityRepository;
import com.reserve.activity.ActivityType;
import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Donation;
import com.reserve.donation.DonationRepository;
import com.reserve.donation.DonationService;
import com.reserve.donation.LocationPing;
import com.reserve.donation.LocationPingRepository;
import com.reserve.donation.SafetyCheck;
import com.reserve.donation.Status;
import com.reserve.donation.Unit;
import com.reserve.donation.Geo;
import com.reserve.user.Role;
import java.util.Comparator;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private record Template(User donor, String title, Diet diet, Category category, Unit unit, int minQty, int maxQty) {
    }

    private record Pattern(Set<DayOfWeek> days, LocalTime from, LocalTime until, int minQty, int maxQty, List<Template> templates) {
    }

    private final UserRepository users;
    private final DonationRepository donations;
    private final LocationPingRepository pings;
    private final ActivityRepository activities;
    private final PasswordEncoder encoder;
    private final ZoneId zone;
    private final Random random = new Random(2400);
    private final Random history = new Random(42);
    private final List<Activity> feed = new ArrayList<>();
    private int listed;
    private String passwordHash;

    public DataSeeder(UserRepository users, DonationRepository donations, LocationPingRepository pings,
                      ActivityRepository activities, PasswordEncoder encoder, @Value("${app.zone}") String zone) {
        this.users = users;
        this.donations = donations;
        this.pings = pings;
        this.activities = activities;
        this.encoder = encoder;
        this.zone = ZoneId.of(zone);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            topUpFeed(OffsetDateTime.now());
            return;
        }
        passwordHash = encoder.encode("reserve123");
        OffsetDateTime now = OffsetDateTime.now();

        User hope = user(Role.NGO, "Annadhanam Seva Trust", "9840100003", "Community kitchen", null, "14 GST Road, Guduvanchery", 12.8452, 80.0601, "4.9");
        User littleHearts = user(Role.NGO, "Asha Deepam Children's Home", "9840100011", "Children's home", null, "7 Church Street, Tambaram West", 12.9246, 80.1103, "4.8");
        User annai = user(Role.NGO, "Karunai Illam Shelter", "9840100012", "Shelter", null, "22 Anna Salai, Maraimalai Nagar", 12.7957, 80.0242, "4.7");

        User kalyan = user(Role.DONOR, "Kalyan Mahal", "9840100001", "Event venue", null, "12 Rajaji Street, Kattankulathur", 12.8160, 80.0420, "4.8");
        User annapoorna = user(Role.DONOR, "Hotel Annapoorna", "9840100005", "Restaurant", null, "88 GST Road, Guduvanchery", 12.8476, 80.0623, "4.7");
        User srmMess = user(Role.DONOR, "SRM Mess", "9840100006", "Hostel", null, "SRM Nagar, Potheri", 12.8231, 80.0430, "4.6");
        User spiceRoute = user(Role.DONOR, "Spice Route", "9840100007", "Restaurant", null, "3 Station Road, Maraimalai Nagar", 12.7915, 80.0250, "4.8");
        User sunrise = user(Role.DONOR, "Sunrise Bakery", "9840100008", "Bakery", null, "21 Main Road, Urapakkam", 12.8635, 80.0688, "4.9");
        User greenBasket = user(Role.DONOR, "Green Basket", "9840100009", "Grocery store", null, "5 Vandalur Road, Nandivaram", 12.8510, 80.0705, "4.7");
        User techPark = user(Role.DONOR, "TechPark Cafeteria", "9840100010", "Corporate cafeteria", null, "Estancia IT Park, Vallancherry", 12.8335, 80.0505, "4.8");
        User meena = user(Role.DONOR, "Meena's Kitchen", "9840100013", "Home kitchen", null, "9 Lakshmi Nagar, Kattankulathur", 12.8105, 80.0385, "5.0");

        User krrish = user(Role.VOLUNTEER, "Divit Periwal", "9840100002", "Student", "Scooter", "SRM Nagar, Potheri", 12.8231, 80.0442, "4.9");
        User ravi = user(Role.VOLUNTEER, "Ravi Kumar", "9840100004", "Delivery rider", "Motorbike", "Gandhi Road, Guduvanchery", 12.8440, 80.0580, "4.9");
        User priya = user(Role.VOLUNTEER, "Priya Subramanian", "9840100014", "Student", "Scooter", "Lake View Road, Urapakkam", 12.8650, 80.0690, "4.8");
        User arjun = user(Role.VOLUNTEER, "Arjun Menon", "9840100015", "Student", "Bicycle", "Thiru Vi Ka Street, Maraimalai Nagar", 12.7960, 80.0270, "4.7");
        User nithya = user(Role.VOLUNTEER, "Nithya Venkatesan", "9840100016", "Teacher", "Scooter", "Kamaraj Street, Vandalur", 12.8920, 80.0810, "4.8");
        krrish.setDropNgo(hope);

        seedAvailable(now, annapoorna, spiceRoute, srmMess, meena, kalyan, techPark, sunrise, greenBasket);
        seedActiveRun(now, kalyan, ravi, hope);
        seedExpired(now, sunrise, techPark, annapoorna);

        List<Template> templates = List.of(
                new Template(annapoorna, "Sambar rice", Diet.VEG, Category.COOKED, Unit.SERVINGS, 15, 40),
                new Template(annapoorna, "Lemon rice and curd rice", Diet.VEG, Category.COOKED, Unit.SERVINGS, 10, 30),
                new Template(spiceRoute, "Chicken biryani", Diet.NON_VEG, Category.COOKED, Unit.SERVINGS, 15, 35),
                new Template(spiceRoute, "Egg fried rice", Diet.NON_VEG, Category.COOKED, Unit.SERVINGS, 10, 25),
                new Template(srmMess, "Chapati and dal", Diet.VEG, Category.COOKED, Unit.SERVINGS, 30, 80),
                new Template(srmMess, "Curd rice", Diet.VEG, Category.COOKED, Unit.SERVINGS, 25, 60),
                new Template(kalyan, "Reception dinner: rice, sambar and poriyal", Diet.VEG, Category.COOKED, Unit.SERVINGS, 40, 120),
                new Template(kalyan, "Veg pulao", Diet.VEG, Category.COOKED, Unit.SERVINGS, 30, 80),
                new Template(sunrise, "Bread loaves", Diet.VEG, Category.BAKERY, Unit.PACKS, 15, 40),
                new Template(sunrise, "Buns and veg puffs", Diet.VEG, Category.BAKERY, Unit.PACKS, 20, 50),
                new Template(sunrise, "Egg puffs", Diet.NON_VEG, Category.BAKERY, Unit.PACKS, 10, 30),
                new Template(greenBasket, "Tomatoes and onions", Diet.VEG, Category.FRUIT_VEG, Unit.KG, 5, 20),
                new Template(greenBasket, "Bananas", Diet.VEG, Category.FRUIT_VEG, Unit.KG, 4, 15),
                new Template(greenBasket, "Rice and toor dal", Diet.VEG, Category.RAW, Unit.KG, 5, 25),
                new Template(techPark, "Veg meals", Diet.VEG, Category.COOKED, Unit.SERVINGS, 20, 50),
                new Template(techPark, "Lunch thali", Diet.VEG, Category.COOKED, Unit.SERVINGS, 20, 50),
                new Template(techPark, "Sandwiches", Diet.VEG, Category.PACKAGED, Unit.PACKS, 15, 40),
                new Template(techPark, "Juice and biscuit packs", Diet.VEG, Category.PACKAGED, Unit.PACKS, 20, 60),
                new Template(meena, "Idli and chutney", Diet.VEG, Category.COOKED, Unit.SERVINGS, 8, 20));
        List<DayOfWeek> weekend = List.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
        List<DayOfWeek> weekdays = List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY);
        List<Pattern> patterns = List.of(
                pattern(weekend, 20, 0, 23, 0, 80, 120, templates, kalyan, Unit.SERVINGS),
                pattern(weekdays, 14, 0, 16, 0, 30, 50, templates, srmMess, Unit.SERVINGS),
                pattern(List.of(DayOfWeek.values()), 21, 0, 22, 30, 10, 20, templates, sunrise, Unit.PACKS),
                pattern(weekdays, 15, 0, 17, 0, 20, 40, templates, techPark, Unit.SERVINGS),
                pattern(List.of(DayOfWeek.FRIDAY, DayOfWeek.SATURDAY), 22, 0, 23, 30, 25, 45, templates, annapoorna, Unit.SERVINGS));
        List<Template> scattered = templates.stream()
                .filter(t -> t.donor() == spiceRoute || t.donor() == greenBasket || t.donor() == meena).toList();
        seedHistory(now, patterns, scattered, List.of(krrish, ravi, priya, arjun, nithya), new double[] {0.11, 0.27, 0.22, 0.20, 0.20},
                List.of(hope, annai, littleHearts), new double[] {0.5, 0.3, 0.2});

        activities.saveAll(feed);
        log.info("Seeded data: {} users, {} donations, {} activities", users.count(), donations.count(), feed.size());
    }

    private void seedAvailable(OffsetDateTime now, User annapoorna, User spiceRoute, User srmMess, User meena, User kalyan,
                               User techPark, User sunrise, User greenBasket) {
        available(now, annapoorna, "Sambar rice and poriyal", Diet.VEG, Category.COOKED, 25, Unit.SERVINGS, 40, "Packed in 3 steel containers, please bring a bag");
        available(now, spiceRoute, "Chicken fried rice", Diet.NON_VEG, Category.COOKED, 18, Unit.SERVINGS, 80, null);
        available(now, srmMess, "Mess dinner: chapati and kurma", Diet.VEG, Category.COOKED, 60, Unit.SERVINGS, 100, "Collect from the back gate near Block C");
        available(now, meena, "Idli and vada", Diet.VEG, Category.COOKED, 12, Unit.SERVINGS, 135, null);
        available(now, kalyan, "Paneer butter masala with rice", Diet.VEG, Category.COOKED, 35, Unit.SERVINGS, 170, "Leftover from a reception, still warm");
        available(now, techPark, "Veg sandwiches", Diet.VEG, Category.PACKAGED, 30, Unit.PACKS, 195, null);
        available(now, sunrise, "Assorted buns and bread", Diet.VEG, Category.BAKERY, 40, Unit.PACKS, 275, null);
        available(now, greenBasket, "Bananas and seasonal vegetables", Diet.VEG, Category.FRUIT_VEG, 15, Unit.KG, 445, "Slightly bruised but fresh");
        available(now, annapoorna, "Rice and toor dal", Diet.VEG, Category.RAW, 10, Unit.KG, 1305, "Sealed sacks");
        available(now, spiceRoute, "Chicken biryani", Diet.NON_VEG, Category.COOKED, 30, Unit.SERVINGS, 150, "Comes with onion raita");
        available(now, sunrise, "Veg puffs", Diet.VEG, Category.BAKERY, 24, Unit.PACKS, 360, null);
        available(now, annapoorna, "Lemon rice and curd rice", Diet.VEG, Category.COOKED, 20, Unit.SERVINGS, 95, null);
        available(now, techPark, "Veg meals", Diet.VEG, Category.COOKED, 45, Unit.SERVINGS, 220, "Lunch counter on the ground floor");
    }

    // Keep the feed alive across restarts: repost fresh listings once most have expired
    private void topUpFeed(OffsetDateTime now) {
        if (donations.findByStatusAndPickupUntilAfter(Status.AVAILABLE, now).size() + donations.findByStatusAndPickupUntilAfter(Status.ACCEPTED, now).size() >= 5) {
            return;
        }
        List<String> phones = List.of("9840100005", "9840100007", "9840100006", "9840100013", "9840100001", "9840100010", "9840100008", "9840100009");
        List<User> donors = phones.stream().map(p -> users.findByPhone(p).orElse(null)).toList();
        if (donors.contains(null)) {
            return;
        }
        seedAvailable(now, donors.get(0), donors.get(1), donors.get(2), donors.get(3), donors.get(4), donors.get(5), donors.get(6), donors.get(7));
        activities.saveAll(feed);
        log.info("Topped up the feed with fresh listings");
    }

    private void available(OffsetDateTime now, User donor, String title, Diet diet, Category category, int qty, Unit unit,
                           int expiresInMinutes, String note) {
        OffsetDateTime posted = now.minusMinutes(15 + random.nextInt(50));
        OffsetDateTime bestBefore = now.plusMinutes(expiresInMinutes);
        Donation d = donation(donor, title, diet, category, qty, unit, posted, bestBefore);
        d.setPickupUntil(bestBefore.minusMinutes(Math.min(30, expiresInMinutes / 4)));
        d.setNote(note);
        User ngo = listed++ % 2 == 0 ? null : nearestNgo(d);
        if (ngo != null) {
            d.setNgo(ngo);
            d.setStatus(Status.ACCEPTED);
        }
        donations.save(d);
        feed.add(new Activity(ActivityType.POSTED, donor, d, posted));
        if (ngo != null) {
            feed.add(new Activity(ActivityType.ACCEPTED, ngo, d, posted.plusMinutes(5)));
        }
    }

    private User nearestNgo(Donation d) {
        return users.findByRoleOrderByNameAsc(Role.NGO).stream()
                .min(Comparator.comparingDouble(n -> Geo.distanceKm(d.getLat(), d.getLng(), n.getLat(), n.getLng()))).orElse(null);
    }

    private void seedActiveRun(OffsetDateTime now, User kalyan, User ravi, User hope) {
        OffsetDateTime posted = now.minusMinutes(55);
        Donation d = donation(kalyan, "Veg biryani", Diet.VEG, Category.COOKED, 40, Unit.SERVINGS, posted, now.plusMinutes(185));
        d.setNote("4 large vessels with raita on the side");
        d.setContainers(4);
        d.setStatus(Status.PICKED_UP);
        d.setVolunteer(ravi);
        d.setNgo(hope);
        d.setClaimedAt(now.minusMinutes(42));
        d.setPickedUpAt(now.minusMinutes(12));
        donations.save(d);

        double[] fractions = {0.05, 0.15, 0.27, 0.38, 0.50, 0.61};
        double lat = 0;
        double lng = 0;
        OffsetDateTime at = null;
        for (int i = 0; i < fractions.length; i++) {
            lat = kalyan.getLat() + (hope.getLat() - kalyan.getLat()) * fractions[i] + (i % 2 == 0 ? 0.0004 : -0.0003);
            lng = kalyan.getLng() + (hope.getLng() - kalyan.getLng()) * fractions[i] + (i % 2 == 0 ? -0.0003 : 0.0004);
            at = now.minusSeconds(600 - i * 110L);
            pings.save(new LocationPing(d.getId(), lat, lng, at));
        }
        d.setCurrentLocation(lat, lng, at);

        feed.add(new Activity(ActivityType.POSTED, kalyan, d, posted));
        feed.add(new Activity(ActivityType.CLAIMED, ravi, d, d.getClaimedAt()));
        feed.add(new Activity(ActivityType.PICKED_UP, ravi, d, d.getPickedUpAt()));
    }

    private void seedExpired(OffsetDateTime now, User... donors) {
        int daysBack = 1;
        for (User donor : donors) {
            OffsetDateTime posted = now.minusDays(daysBack).withHour(13).withMinute(10);
            Donation d = donation(donor, donor.getOrgType().equals("Bakery") ? "Day-old cakes" : "Leftover lunch trays",
                    Diet.VEG, donor.getOrgType().equals("Bakery") ? Category.BAKERY : Category.COOKED, 12 + daysBack * 3,
                    Unit.SERVINGS, posted, posted.plusHours(3));
            d.setStatus(Status.EXPIRED);
            donations.save(d);
            feed.add(new Activity(ActivityType.POSTED, donor, d, posted));
            feed.add(new Activity(ActivityType.EXPIRED, donor, d, d.getBestBefore()));
            daysBack += 2;
        }
    }

    private Pattern pattern(List<DayOfWeek> days, int fromHour, int fromMinute, int untilHour, int untilMinute, int minQty,
                            int maxQty, List<Template> templates, User donor, Unit unit) {
        List<Template> mine = templates.stream().filter(t -> t.donor() == donor && t.unit() == unit).toList();
        return new Pattern(EnumSet.copyOf(days), LocalTime.of(fromHour, fromMinute), LocalTime.of(untilHour, untilMinute), minQty, maxQty, mine);
    }

    // Eight weeks of recurring donor routines plus scattered posts, thinning out further back so recent periods grow
    private void seedHistory(OffsetDateTime now, List<Pattern> patterns, List<Template> scattered, List<User> volunteers,
                             double[] volunteerWeights, List<User> ngos, double[] ngoWeights) {
        LocalDate today = LocalDate.now(zone);
        List<Donation> batch = new ArrayList<>();
        for (int back = 56; back >= 0; back--) {
            LocalDate day = today.minusDays(back);
            for (Pattern p : patterns) {
                if (p.days().contains(day.getDayOfWeek()) && history.nextDouble() >= 0.15 * back / 56) {
                    Template t = p.templates().get(history.nextInt(p.templates().size()));
                    past(batch, now, t, day, p.from(), p.until(), p.minQty() + history.nextInt(p.maxQty() - p.minQty() + 1),
                            volunteers, volunteerWeights, ngos, ngoWeights);
                }
            }
            for (Template t : scattered) {
                if (history.nextDouble() < 0.04 + 0.08 * (56 - back) / 56) {
                    LocalTime from = LocalTime.of(11 + history.nextInt(9), 15 * history.nextInt(4));
                    past(batch, now, t, day, from, from.plusHours(2), t.minQty() + history.nextInt(t.maxQty() - t.minQty() + 1),
                            volunteers, volunteerWeights, ngos, ngoWeights);
                }
            }
        }
        donations.saveAll(batch);
    }

    private void past(List<Donation> batch, OffsetDateTime now, Template t, LocalDate day, LocalTime from, LocalTime until,
                      int qty, List<User> volunteers, double[] volunteerWeights, List<User> ngos, double[] ngoWeights) {
        OffsetDateTime pickupFrom = day.atTime(from).atZone(zone).toOffsetDateTime();
        OffsetDateTime pickupUntil = day.atTime(until).atZone(zone).toOffsetDateTime();
        OffsetDateTime posted = pickupFrom.minusMinutes(5 + history.nextInt(31));
        OffsetDateTime claimed = pickupFrom.plusMinutes(history.nextInt(26));
        OffsetDateTime picked = claimed.plusMinutes(10 + history.nextInt(31));
        OffsetDateTime delivered = picked.plusMinutes(12 + history.nextInt(29));
        OffsetDateTime bestBefore = pickupUntil.plusMinutes(45);
        boolean expired = history.nextDouble() < 0.12;
        User volunteer = weighted(volunteers, volunteerWeights);
        User ngo = weighted(ngos, ngoWeights);
        if (!(expired ? bestBefore : delivered).isBefore(now)) {
            return;
        }

        Donation d = donation(t.donor(), t.title(), t.diet(), t.category(), qty, t.unit(), posted, bestBefore);
        d.setPickupFrom(pickupFrom);
        d.setPickupUntil(pickupUntil);
        batch.add(d);
        feed.add(new Activity(ActivityType.POSTED, t.donor(), d, posted));
        if (expired) {
            d.setStatus(Status.EXPIRED);
            feed.add(new Activity(ActivityType.EXPIRED, t.donor(), d, bestBefore));
            return;
        }
        d.setStatus(Status.DELIVERED);
        d.setVolunteer(volunteer);
        d.setNgo(ngo);
        d.setClaimedAt(claimed);
        d.setPickedUpAt(picked);
        d.setDeliveredAt(delivered);
        feed.add(new Activity(ActivityType.CLAIMED, volunteer, d, claimed));
        feed.add(new Activity(ActivityType.PICKED_UP, volunteer, d, picked));
        feed.add(new Activity(ActivityType.DELIVERED, volunteer, d, delivered));
    }

    private Donation donation(User donor, String title, Diet diet, Category category, int qty, Unit unit,
                              OffsetDateTime posted, OffsetDateTime bestBefore) {
        Donation d = new Donation(donor, title, diet, category, qty, unit);
        d.setLocation(donor.getAddress(), donor.getLat(), donor.getLng());
        d.setCreatedAt(posted);
        d.setPreparedAt(category == Category.COOKED || category == Category.BAKERY ? posted.minusMinutes(40) : null);
        d.setBestBefore(bestBefore);
        d.setPickupFrom(posted);
        d.setPickupUntil(bestBefore);
        d.setSafetyCheckList(EnumSet.allOf(SafetyCheck.class));
        d.setContainers(unit == Unit.SERVINGS ? Math.max(1, qty / 12) : null);
        d.setPickupCode(DonationService.handoverCode());
        d.setDropCode(DonationService.handoverCode());
        return d;
    }

    private User user(Role role, String name, String phone, String orgType, String vehicle, String address,
                      double lat, double lng, String rating) {
        User u = new User(role, name, phone, passwordHash, address, lat, lng);
        u.setOrgType(orgType);
        u.setVehicle(vehicle);
        u.setVerified(true);
        u.setRating(new BigDecimal(rating));
        u.setCreatedAt(OffsetDateTime.now().minusDays(90));
        return users.save(u);
    }

    private <T> T weighted(List<T> items, double[] weights) {
        double r = history.nextDouble();
        for (int i = 0; i < items.size() - 1; i++) {
            r -= weights[i];
            if (r < 0) {
                return items.get(i);
            }
        }
        return items.get(items.size() - 1);
    }
}
