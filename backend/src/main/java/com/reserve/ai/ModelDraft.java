package com.reserve.ai;

public record ModelDraft(
        String title,
        String diet,
        String category,
        Integer quantity,
        String unit,
        Integer bestBeforeMinutes,
        Integer pickupFromMinutes,
        Integer pickupUntilMinutes,
        String note) {
}
