package com.reserve.push;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

class PushServiceTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2026-11-16T19:00:00+05:30");

    @Test
    void ttlFollowsTheFoodDeadlineWithinOneMinuteAndFourHours() {
        assertEquals(90 * 60, PushService.ttlSeconds(NOW.plusMinutes(90), NOW));
        assertEquals(4 * 3600, PushService.ttlSeconds(NOW.plusDays(2), NOW));
        assertEquals(60, PushService.ttlSeconds(NOW.plusSeconds(5), NOW));
        assertEquals(60, PushService.ttlSeconds(NOW.minusMinutes(10), NOW));
    }

    @Test
    void deliveryHintsStayOutOfThePayload() throws Exception {
        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(new PushMessage("t", "b", "/ngo", NOW, true));

        assertEquals("{\"title\":\"t\",\"body\":\"b\",\"url\":\"/ngo\"}", json);
    }
}
