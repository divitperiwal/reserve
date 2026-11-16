package com.reserve.stats;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Donation;
import com.reserve.donation.DonationRepository;
import com.reserve.donation.Status;
import com.reserve.donation.Unit;
import com.reserve.stats.StatsDtos.Leaderboard;
import com.reserve.user.Role;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class StatsServiceTest {

    private static User user(Role role, long id, String name) {
        User u = new User(role, name, "98" + id, "x", "Road", 12.9, 77.6);
        ReflectionTestUtils.setField(u, "id", id);
        return u;
    }

    private static Donation delivered(User donor, User volunteer, int meals) {
        Donation d = new Donation(donor, "Food", Diet.VEG, Category.COOKED, meals, Unit.SERVINGS);
        d.setVolunteer(volunteer);
        d.setStatus(Status.DELIVERED);
        d.setDeliveredAt(OffsetDateTime.now());
        return d;
    }

    @Test
    void leaderboardRanksByMealsAndAssignsHighestBadge() {
        User donor = user(Role.DONOR, 1, "Annapurna Kitchen");
        User busy = user(Role.VOLUNTEER, 2, "Ravi Kumar");
        User light = user(Role.VOLUNTEER, 3, "Meena Iyer");
        List<Donation> rows = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            rows.add(delivered(donor, busy, 5));
        }
        rows.add(delivered(donor, light, 100));
        DonationRepository donations = mock(DonationRepository.class);
        when(donations.findDeliveredSince(any())).thenReturn(rows);
        StatsService service = new StatsService(donations, mock(UserRepository.class), "Asia/Kolkata");

        Leaderboard board = service.leaderboard(30);

        assertEquals(150, board.meals());
        assertEquals(2, board.volunteers().size());
        assertEquals("Meena Iyer", board.volunteers().get(0).name());
        assertNull(board.volunteers().get(0).badge());
        assertEquals("Silver", board.volunteers().get(1).badge());
        assertEquals(11, board.donors().get(0).donations());
    }
}
