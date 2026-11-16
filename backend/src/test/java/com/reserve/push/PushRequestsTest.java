package com.reserve.push;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PushRequestsTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private int violations(String endpoint) {
        return validator.validate(new PushRequests.Subscribe(endpoint, new PushRequests.Keys("k", "a"))).size();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://fcm.googleapis.com/fcm/send/abc",
            "https://updates.push.services.mozilla.com/wpush/v2/abc",
            "https://web.push.apple.com/abc",
            "https://wns2-par02p.notify.windows.com/w/?token=abc",
            "https://FCM.googleapis.com:443/fcm/send/abc"})
    void knownPushServicesAreAccepted(String endpoint) {
        assertEquals(0, violations(endpoint));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://fcm.googleapis.com/x",
            "https://localhost:8080/admin",
            "https://169.254.169.254/latest/meta-data",
            "https://evil.com/fcm.googleapis.com/x",
            "https://fcm.googleapis.com.evil.com/x",
            "https://fcm.googleapis.com@evil.com/x",
            "https://evilgoogleapis.com/x"})
    void everythingElseIsRejected(String endpoint) {
        assertEquals(1, violations(endpoint));
    }

    @Test
    void blankEndpointIsStillRejected() {
        assertTrue(violations("") > 0);
    }
}
