package com.reserve.push;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class PushRequests {

    static final String PUSH_HOSTS = "https://([a-z0-9-]+\\.)*(googleapis\\.com|push\\.services\\.mozilla\\.com|push\\.apple\\.com|notify\\.windows\\.com)(:\\d+)?/.+";

    private PushRequests() {
    }

    public record Subscribe(
            @NotBlank(message = "Missing endpoint") @Pattern(regexp = PUSH_HOSTS, flags = Pattern.Flag.CASE_INSENSITIVE, message = "Endpoint must be a browser push service") String endpoint,
            @NotNull(message = "Missing keys") @Valid Keys keys) {
    }

    public record Keys(@NotBlank(message = "Missing key") String p256dh, @NotBlank(message = "Missing key") String auth) {
    }

    public record Unsubscribe(@NotBlank(message = "Missing endpoint") String endpoint) {
    }
}
