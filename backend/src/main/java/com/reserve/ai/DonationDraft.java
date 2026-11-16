package com.reserve.ai;

import com.reserve.donation.Category;
import com.reserve.donation.Diet;
import com.reserve.donation.Unit;
import java.util.Locale;

public record DonationDraft(
        String title,
        Diet diet,
        Category category,
        Integer quantity,
        Unit unit,
        Integer bestBeforeMinutes,
        Integer pickupFromMinutes,
        Integer pickupUntilMinutes,
        String note) {

    private static final int MAX_TITLE = 160;
    private static final int MAX_NOTE = 500;
    private static final int MAX_QUANTITY = 10000;
    private static final int MAX_MINUTES = 2880;

    // The schema has no nulls, so the model sends "" or -1 for unknown; enums, text and negatives become null, the rest is clamped
    public static DonationDraft clean(ModelDraft raw) {
        return new DonationDraft(
                text(raw.title(), MAX_TITLE),
                enumOf(Diet.class, raw.diet()),
                enumOf(Category.class, raw.category()),
                clamp(raw.quantity(), 1, MAX_QUANTITY),
                enumOf(Unit.class, raw.unit()),
                clamp(raw.bestBeforeMinutes(), 0, MAX_MINUTES),
                clamp(raw.pickupFromMinutes(), 0, MAX_MINUTES),
                clamp(raw.pickupUntilMinutes(), 0, MAX_MINUTES),
                text(raw.note(), MAX_NOTE));
    }

    private static String text(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > max ? trimmed.substring(0, max).trim() : trimmed;
    }

    private static <E extends Enum<E>> E enumOf(Class<E> type, String value) {
        if (value == null) {
            return null;
        }
        try {
            return Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Integer clamp(Integer value, int min, int max) {
        return value == null || value < 0 ? null : Math.max(min, Math.min(max, value));
    }
}
