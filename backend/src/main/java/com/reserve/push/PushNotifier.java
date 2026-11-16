package com.reserve.push;

import static java.util.stream.Collectors.toMap;

import com.reserve.donation.DonationEvent;
import com.reserve.donation.DonationRepository;
import com.reserve.user.Role;
import com.reserve.user.UserRepository;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class PushNotifier {

    private final PushService push;
    private final DonationRepository donations;
    private final UserRepository users;
    private final ZoneId zone;

    public PushNotifier(PushService push, DonationRepository donations, UserRepository users, @Value("${app.zone}") String zone) {
        this.push = push;
        this.donations = donations;
        this.users = users;
        this.zone = ZoneId.of(zone);
    }

    // Runs on the task pool once the donation is committed
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(DonationEvent event) {
        if (!push.enabled()) {
            return;
        }
        donations.findById(event.donationId()).ifPresent(d -> {
            List<PushTargeting.Delivery> deliveries = switch (event.type()) {
                case CREATED -> PushTargeting.created(d, users.findByRoleOrderByNameAsc(Role.NGO), OffsetDateTime.now(), zone);
                case ACCEPTED -> PushTargeting.accepted(d, users.findByRoleAndOnDutyTrue(Role.VOLUNTEER), zone);
            };
            push.send(deliveries.stream().collect(toMap(x -> x.user().getId(), PushTargeting.Delivery::message, (a, b) -> a, LinkedHashMap::new)));
        });
    }
}
