package com.reserve.voice;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class SpokenTimeTest {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final ZonedDateTime NOW = ZonedDateTime.of(2026, 11, 16, 19, 30, 0, 0, IST);

    @Test
    void minutesFromNow() {
        assertEquals(NOW.plusMinutes(90).toOffsetDateTime(), SpokenTime.parse("+90", NOW));
        assertEquals(NOW.plusMinutes(5).toOffsetDateTime(), SpokenTime.parse(" + 5 ", NOW));
    }

    @Test
    void clockTimeLaterToday() {
        assertEquals(ZonedDateTime.of(2026, 11, 16, 21, 0, 0, 0, IST).toOffsetDateTime(), SpokenTime.parse("21:00", NOW));
    }

    @Test
    void pastClockTimeRollsToTomorrow() {
        assertEquals(ZonedDateTime.of(2026, 11, 17, 8, 15, 0, 0, IST).toOffsetDateTime(), SpokenTime.parse("8:15", NOW));
        assertEquals(ZonedDateTime.of(2026, 11, 17, 19, 30, 0, 0, IST).toOffsetDateTime(), SpokenTime.parse("19:30", NOW));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "90", "+0", "+abc", "25:00", "21:60", "9 pm", "21.00"})
    void rejectsAnythingElse(String text) {
        assertThrows(IllegalArgumentException.class, () -> SpokenTime.parse(text, NOW));
    }

    @Test
    void speaksTimesForReadingAloud() {
        assertEquals("9 pm", SpokenTime.speak(SpokenTime.parse("21:00", NOW), NOW));
        assertEquals("9 pm", SpokenTime.speak(SpokenTime.parse("+90", NOW), NOW));
        assertEquals("12:05 am tomorrow", SpokenTime.speak(SpokenTime.parse("00:05", NOW), NOW));
        assertEquals("12 pm tomorrow", SpokenTime.speak(SpokenTime.parse("12:00", NOW), NOW));
    }
}
