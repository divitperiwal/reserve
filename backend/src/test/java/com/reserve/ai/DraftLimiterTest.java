package com.reserve.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class DraftLimiterTest {

    private static final Instant T0 = Instant.parse("2026-01-01T10:00:00Z");

    @Test
    void blocksThe31stDraftInAnHour() {
        DraftLimiter limiter = new DraftLimiter();
        for (int i = 0; i < DraftLimiter.LIMIT; i++) {
            assertTrue(limiter.tryAcquire(1L, T0.plusSeconds(i)));
        }

        assertFalse(limiter.tryAcquire(1L, T0.plusSeconds(100)));
    }

    @Test
    void otherDonorsAreNotAffected() {
        DraftLimiter limiter = new DraftLimiter();
        for (int i = 0; i < DraftLimiter.LIMIT; i++) {
            limiter.tryAcquire(1L, T0);
        }

        assertTrue(limiter.tryAcquire(2L, T0));
    }

    @Test
    void allowsAgainOnceTheHourHasPassed() {
        DraftLimiter limiter = new DraftLimiter();
        for (int i = 0; i < DraftLimiter.LIMIT; i++) {
            limiter.tryAcquire(1L, T0);
        }

        assertFalse(limiter.tryAcquire(1L, T0.plusSeconds(3599)));
        assertTrue(limiter.tryAcquire(1L, T0.plusSeconds(3600)));
    }
}
