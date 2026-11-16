package com.reserve.push;

import com.reserve.auth.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushService push;

    public PushController(PushService push) {
        this.push = push;
    }

    @GetMapping("/key")
    public PushKey key() {
        return push.key();
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PushRequests.Subscribe req) {
        push.subscribe(me.id(), req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PushRequests.Unsubscribe req) {
        push.unsubscribe(me.id(), req.endpoint());
        return ResponseEntity.noContent().build();
    }
}
