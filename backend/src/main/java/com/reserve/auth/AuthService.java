package com.reserve.auth;

import com.reserve.auth.AuthRequests.AuthResponse;
import com.reserve.auth.AuthRequests.Login;
import com.reserve.auth.AuthRequests.OtpSent;
import com.reserve.auth.AuthRequests.Register;
import com.reserve.common.ApiException;
import com.reserve.user.User;
import com.reserve.user.UserRepository;
import com.reserve.user.UserService;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final UserService userService;
    private final OtpCodeRepository otps;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final boolean otpDev;

    public AuthService(UserRepository users, UserService userService, OtpCodeRepository otps, PasswordEncoder encoder,
                       JwtService jwt, @Value("${app.otp.dev}") boolean otpDev) {
        this.users = users;
        this.userService = userService;
        this.otps = otps;
        this.encoder = encoder;
        this.jwt = jwt;
        this.otpDev = otpDev;
    }

    @Transactional
    public AuthResponse register(Register req) {
        String phone = normalizePhone(req.phone());
        if (users.existsByPhone(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this phone number already exists",
                    Map.of("phone", "Already registered, sign in instead"));
        }
        User user = new User(req.role(), req.name().trim(), phone, encoder.encode(req.password()),
                req.address().trim(), req.lat(), req.lng());
        user.setOrgType(blankToNull(req.orgType()));
        user.setVehicle(blankToNull(req.vehicle()));
        return respond(users.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(Login req) {
        return users.findByPhone(normalizePhone(req.phone()))
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .map(this::respond)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Wrong phone number or password"));
    }

    @Transactional
    public OtpSent requestOtp(String rawPhone) {
        String phone = normalizePhone(rawPhone);
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        otps.save(new OtpCode(phone, code, OffsetDateTime.now().plusMinutes(5)));
        if (otpDev) {
            log.info("OTP for {} is {}", phone, code);
            return new OtpSent(true, code);
        }
        return new OtpSent(true, null);
    }

    @Transactional
    public AuthResponse verifyOtp(String rawPhone, String code) {
        String phone = normalizePhone(rawPhone);
        OtpCode otp = otps.findById(phone).filter(o -> o.matches(code.trim()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "That code is wrong or has expired",
                        Map.of("code", "Wrong or expired code")));
        User user = users.findByPhone(phone)
                .orElseThrow(() -> ApiException.notFound("No account with this phone number yet"));
        otps.delete(otp);
        return respond(user);
    }

    private AuthResponse respond(User user) {
        return new AuthResponse(jwt.issue(user), userService.toDto(user));
    }

    // Accepts "+91 98401 00001", "919840100001" or "9840100001" and keeps the 10 digits
    static String normalizePhone(String raw) {
        String digits = raw == null ? "" : raw.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        }
        if (digits.length() != 10) {
            throw ApiException.badRequest("Enter a 10 digit phone number", Map.of("phone", "Enter a 10 digit phone number"));
        }
        return digits;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
