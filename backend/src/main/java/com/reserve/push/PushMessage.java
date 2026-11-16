package com.reserve.push;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.OffsetDateTime;

public record PushMessage(String title, String body, String url, @JsonIgnore OffsetDateTime expiresAt, @JsonIgnore boolean urgent) {
}
