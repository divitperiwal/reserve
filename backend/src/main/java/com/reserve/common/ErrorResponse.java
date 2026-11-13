package com.reserve.common;

import java.util.Map;

public record ErrorResponse(String message, Map<String, String> fields) {

    public ErrorResponse(String message) {
        this(message, null);
    }
}
