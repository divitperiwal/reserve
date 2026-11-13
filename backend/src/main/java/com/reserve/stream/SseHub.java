package com.reserve.stream;

import java.io.IOException;
import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class SseHub {

    private static final long TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    private final Map<Long, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter connect(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.computeIfAbsent(userId, id -> new CopyOnWriteArraySet<>()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(e -> remove(userId, emitter));
        send(userId, emitter, SseEmitter.event().comment("connected").reconnectTime(3000));
        return emitter;
    }

    public void broadcast(String event, Object data) {
        afterCommit(() -> emitters.forEach((userId, set) -> set.forEach(e -> send(userId, e, SseEmitter.event().name(event).data(data)))));
    }

    public void sendTo(Collection<Long> userIds, String event, Object data) {
        afterCommit(() -> userIds.stream().distinct().forEach(userId ->
                emitters.getOrDefault(userId, Set.of()).forEach(e -> send(userId, e, SseEmitter.event().name(event).data(data)))));
    }

    @Scheduled(fixedRate = 20_000)
    public void heartbeat() {
        emitters.forEach((userId, set) -> set.forEach(e -> send(userId, e, SseEmitter.event().comment("heartbeat"))));
    }

    // Events go out only once the change is committed, so clients that refetch see the new state
    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    // A dead client is only dropped; completing its emitter here would throw on the already failed async context
    private void send(Long userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | RuntimeException e) {
            remove(userId, emitter);
        }
    }

    private void remove(Long userId, SseEmitter emitter) {
        emitters.computeIfPresent(userId, (id, set) -> {
            set.remove(emitter);
            return set.isEmpty() ? null : set;
        });
    }
}
