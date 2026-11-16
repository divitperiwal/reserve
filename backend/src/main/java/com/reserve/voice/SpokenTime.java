package com.reserve.voice;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class SpokenTime {

    private static final Pattern MINUTES = Pattern.compile("\\+\\s*(\\d{1,4})");
    private static final Pattern CLOCK = Pattern.compile("(\\d{1,2}):(\\d{2})");

    private SpokenTime() {
    }

    // "+90" is minutes from now; "21:00" is the next time the clock shows 21:00
    static OffsetDateTime parse(String text, ZonedDateTime now) {
        String t = text == null ? "" : text.trim();
        Matcher m = MINUTES.matcher(t);
        if (m.matches() && Integer.parseInt(m.group(1)) > 0) {
            return now.plusMinutes(Integer.parseInt(m.group(1))).toOffsetDateTime();
        }
        m = CLOCK.matcher(t);
        if (m.matches()) {
            int hour = Integer.parseInt(m.group(1));
            int minute = Integer.parseInt(m.group(2));
            if (hour < 24 && minute < 60) {
                ZonedDateTime at = now.with(LocalTime.of(hour, minute));
                return (at.isAfter(now) ? at : at.plusDays(1)).toOffsetDateTime();
            }
        }
        throw new IllegalArgumentException("Not a spoken time: " + text);
    }

    // "9 pm" or "9:30 am", with "tomorrow" when it falls after today
    static String speak(OffsetDateTime time, ZonedDateTime now) {
        ZonedDateTime at = time.atZoneSameInstant(now.getZone());
        int hour12 = at.getHour() % 12 == 0 ? 12 : at.getHour() % 12;
        String clock = at.getMinute() == 0 ? String.valueOf(hour12) : String.format("%d:%02d", hour12, at.getMinute());
        String day = at.toLocalDate().isAfter(now.toLocalDate()) ? " tomorrow" : "";
        return clock + (at.getHour() < 12 ? " am" : " pm") + day;
    }
}
