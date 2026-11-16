package com.reserve.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// shortcut: counts live in this instance's memory, so the limit is per instance and resets on restart
@Component
public class DraftLimiter {

    static final int LIMIT = 30;
    private static final Duration WINDOW = Duration.ofHours(1);

    private final Map<Long, Deque<Instant>> calls = new ConcurrentHashMap<>();

    public boolean tryAcquire(Long donorId, Instant now) {
        Deque<Instant> times = calls.computeIfAbsent(donorId, id -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && !times.peekFirst().isAfter(now.minus(WINDOW))) {
                times.pollFirst();
            }
            if (times.size() >= LIMIT) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
