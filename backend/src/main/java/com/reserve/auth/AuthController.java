package com.reserve.auth;

import com.reserve.auth.AuthRequests.AuthResponse;
import com.reserve.auth.AuthRequests.Login;
import com.reserve.auth.AuthRequests.OtpRequest;
import com.reserve.auth.AuthRequests.OtpSent;
import com.reserve.auth.AuthRequests.OtpVerify;
import com.reserve.auth.AuthRequests.Register;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody Register req) {
        return auth.register(req);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody Login req) {
        return auth.login(req);
    }

    @PostMapping("/otp/request")
    public OtpSent requestOtp(@Valid @RequestBody OtpRequest req) {
        return auth.requestOtp(req.phone());
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerify req) {
        return auth.verifyOtp(req.phone(), req.code());
    }
}
