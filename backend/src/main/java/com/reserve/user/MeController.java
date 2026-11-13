package com.reserve.user;

import com.reserve.auth.AuthUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeController {

    private final UserService users;

    public MeController(UserService users) {
        this.users = users;
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser me) {
        return users.me(me.id());
    }

    @PatchMapping("/me")
    public UserDto update(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody UpdateMeRequest req) {
        return users.update(me.id(), req);
    }

    @GetMapping("/ngos")
    public List<NgoRef> ngos() {
        return users.ngos();
    }
}
