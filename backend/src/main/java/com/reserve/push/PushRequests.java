package com.reserve.push;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class PushRequests {

    private PushRequests() {
    }

    public record Subscribe(
            @NotBlank(message = "Missing endpoint") @Pattern(regexp = "https://.+", message = "Endpoint must be https") String endpoint,
            @NotNull(message = "Missing keys") @Valid Keys keys) {
    }

    public record Keys(@NotBlank(message = "Missing key") String p256dh, @NotBlank(message = "Missing key") String auth) {
    }

    public record Unsubscribe(@NotBlank(message = "Missing endpoint") String endpoint) {
    }
}
