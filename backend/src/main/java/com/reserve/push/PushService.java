package com.reserve.push;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.Collection;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import nl.martijndwars.webpush.Notification;
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

    // Sends to every browser of these users; endpoints that answer 404 or 410 are gone and get removed
    public void send(Collection<Long> userIds, PushMessage message) {
        if (client == null || userIds.isEmpty()) {
            return;
        }
        byte[] payload;
        try {
            payload = json.writeValueAsBytes(message);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        for (PushSubscription s : subscriptions.findByUserIdIn(userIds)) {
            Future<HttpResponse> pending = null;
            try {
                pending = client.sendAsync(new Notification(s.getEndpoint(), s.getP256dh(), s.getAuth(), payload));
                int status = pending.get(TIMEOUT_SECONDS, TimeUnit.SECONDS).getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    subscriptions.delete(s);
                } else if (status >= 400) {
                    log.warn("Push to user {} was refused with {}", s.getUserId(), status);
                }
            } catch (TimeoutException e) {
                pending.cancel(true);
                log.warn("Push to user {} timed out", s.getUserId());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.warn("Push to user {} failed: {}", s.getUserId(), e.toString());
            }
        }
    }
}
