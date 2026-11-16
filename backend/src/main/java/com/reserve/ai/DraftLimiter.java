package com.reserve.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// shortcut: counts live in this instance's memory, so the limits are per instance and reset on restart
@Component
public class DraftLimiter {

    static final int LIMIT = 30;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final int globalLimit;
    private final Map<Long, Deque<Instant>> calls = new HashMap<>();
    private final Deque<Instant> all = new ArrayDeque<>();

    public DraftLimiter(@Value("${app.ai.global-per-hour}") int globalLimit) {
        this.globalLimit = globalLimit;
    }

    public synchronized boolean tryAcquire(Long donorId, Instant now) {
        Deque<Instant> times = calls.computeIfAbsent(donorId, id -> new ArrayDeque<>());
        prune(all, now);
        prune(times, now);
        if (all.size() >= globalLimit || times.size() >= LIMIT) {
            return false;
        }
        all.addLast(now);
        times.addLast(now);
        return true;
    }

    private static void prune(Deque<Instant> times, Instant now) {
        while (!times.isEmpty() && !times.peekFirst().isAfter(now.minus(WINDOW))) {
            times.pollFirst();
        }
    }
}
