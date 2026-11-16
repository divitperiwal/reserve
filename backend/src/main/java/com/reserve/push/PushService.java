package com.reserve.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.Urgency;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);
    private static final long TIMEOUT_SECONDS = 10;
    private static final long MIN_TTL_SECONDS = 60;
    private static final long MAX_TTL_SECONDS = Duration.ofHours(4).toSeconds();

    private final nl.martijndwars.webpush.PushService client;
    private final String publicKey;
    private final PushSubscriptionRepository subscriptions;
    private final ObjectMapper json;

    public PushService(@Value("${app.push.public-key}") String publicKey, @Value("${app.push.private-key}") String privateKey,
                       @Value("${app.push.subject}") String subject, PushSubscriptionRepository subscriptions, ObjectMapper json) {
        this.subscriptions = subscriptions;
        this.json = json;
        if (publicKey.isBlank() || privateKey.isBlank()) {
            this.client = null;
            this.publicKey = null;
            return;
        }
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        try {
            this.client = new nl.martijndwars.webpush.PushService(publicKey.trim(), privateKey.trim(), subject);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY is not a valid key", e);
        }
        this.publicKey = publicKey.trim();
    }

    public boolean enabled() {
        return client != null;
    }

    public PushKey key() {
        return new PushKey(enabled(), publicKey);
    }

    // One row per browser endpoint; a new sign-in on the same browser takes the row over
    @Transactional
    public void subscribe(Long userId, PushRequests.Subscribe req) {
        String p256dh = req.keys().p256dh().trim();
        String auth = req.keys().auth().trim();
        subscriptions.findByEndpoint(req.endpoint()).ifPresentOrElse(
                s -> s.update(userId, p256dh, auth),
                () -> subscriptions.save(new PushSubscription(userId, req.endpoint(), p256dh, auth)));
    }

    @Transactional
    public void unsubscribe(Long userId, String endpoint) {
        subscriptions.deleteByEndpointAndUserId(endpoint, userId);
    }

    @Transactional(readOnly = true)
    public boolean subscribed(Long userId, String endpoint) {
        return subscriptions.existsByEndpointAndUserId(endpoint, userId);
    }

    // An alert is worthless once the food is gone, so it lives until then, between 1 minute and 4 hours
    static int ttlSeconds(OffsetDateTime expiresAt, OffsetDateTime now) {
        return (int) Math.max(MIN_TTL_SECONDS, Math.min(MAX_TTL_SECONDS, Duration.between(now, expiresAt).toSeconds()));
    }

    // Starts every send at once, then waits for all under one 10 s deadline; 404 or 410 means the endpoint is gone
    public void send(Map<Long, PushMessage> messages) {
        if (client == null || messages.isEmpty()) {
            return;
        }
        Map<PushSubscription, Future<HttpResponse>> pending = new LinkedHashMap<>();
        for (PushSubscription s : subscriptions.findByUserIdIn(messages.keySet())) {
            try {
                PushMessage message = messages.get(s.getUserId());
                Notification notification = Notification.builder()
                        .endpoint(s.getEndpoint())
                        .userPublicKey(s.getP256dh())
                        .userAuth(s.getAuth())
                        .payload(json.writeValueAsBytes(message))
                        .ttl(ttlSeconds(message.expiresAt(), OffsetDateTime.now()))
                        .urgency(message.urgent() ? Urgency.HIGH : Urgency.NORMAL)
                        .build();
                pending.put(s, client.sendAsync(notification));
            } catch (Exception e) {
                log.warn("Push to user {} failed: {}", s.getUserId(), e.toString());
            }
        }
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
        for (Map.Entry<PushSubscription, Future<HttpResponse>> e : pending.entrySet()) {
            PushSubscription s = e.getKey();
            try {
                long left = Math.max(0, deadline - System.nanoTime());
                int status = e.getValue().get(left, TimeUnit.NANOSECONDS).getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    subscriptions.delete(s);
                } else if (status >= 400) {
                    log.warn("Push to user {} was refused with {}", s.getUserId(), status);
                }
            } catch (TimeoutException ex) {
                e.getValue().cancel(true);
                log.warn("Push to user {} timed out", s.getUserId());
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                pending.values().forEach(f -> f.cancel(true));
                return;
            } catch (Exception ex) {
                log.warn("Push to user {} failed: {}", s.getUserId(), ex.toString());
            }
        }
    }
}
