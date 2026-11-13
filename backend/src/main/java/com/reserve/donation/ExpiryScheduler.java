package com.reserve.donation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(ExpiryScheduler.class);

    private final DonationService donations;

    public ExpiryScheduler(DonationService donations) {
        this.donations = donations;
    }

    // Expires overdue listings and releases stalled claims, each in its own transaction
    @Scheduled(fixedRate = 60_000, initialDelay = 5_000)
    public void expire() {
        int expired = 0;
        for (Long id : donations.overdueIds()) {
            expired += run("expire", id, () -> donations.expireOne(id));
        }
        if (expired > 0) {
            log.info("Expired {} donations past their pickup window", expired);
        }
        try {
            donations.startClaimClocks();
        } catch (RuntimeException e) {
            log.warn("Could not start claim clocks", e);
        }
        int released = 0;
        for (Long id : donations.stalledIds()) {
            released += run("release", id, () -> donations.releaseOne(id));
        }
        if (released > 0) {
            log.info("Released {} stalled claims", released);
        }
    }

    // Isolates one donation: a conflict is skipped quietly, any other failure is logged, and the pass carries on
    private int run(String what, Long id, Runnable action) {
        try {
            action.run();
            return 1;
        } catch (OptimisticLockingFailureException e) {
            log.debug("Skipped {} of donation {}: it changed at the same time", what, id);
            return 0;
        } catch (RuntimeException e) {
            log.warn("Could not {} donation {}", what, id, e);
            return 0;
        }
    }
}
