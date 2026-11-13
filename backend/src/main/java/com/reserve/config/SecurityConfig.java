package com.reserve.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reserve.auth.JwtAuthFilter;
import com.reserve.common.ErrorResponse;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtFilter, ObjectMapper mapper) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {})
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/stats/public", "/api/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/donations/feed").hasAnyRole("VOLUNTEER", "NGO")
                        .requestMatchers(HttpMethod.POST, "/api/donations", "/api/uploads").hasRole("DONOR")
                        .requestMatchers(HttpMethod.DELETE, "/api/donations/*").hasRole("DONOR")
                        .requestMatchers(HttpMethod.POST, "/api/donations/*/confirm-pickup").hasRole("DONOR")
                        .requestMatchers(HttpMethod.GET, "/api/donations/*/nearby-volunteers").hasRole("DONOR")
                        .requestMatchers(HttpMethod.POST, "/api/donations/*/confirm-delivery", "/api/donations/*/accept",
                                "/api/donations/*/withdraw").hasRole("NGO")
                        .requestMatchers(HttpMethod.POST, "/api/donations/*/claim", "/api/donations/*/release",
                                "/api/donations/*/location").hasRole("VOLUNTEER")
                        .requestMatchers(HttpMethod.GET, "/api/stats/dashboard", "/api/export.csv").hasRole("NGO")
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeError(res, mapper, 401, "Please sign in to continue"))
                        .accessDeniedHandler((req, res, ex) -> writeError(res, mapper, 403, "You don't have access to this")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors-origin}") String origin) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOriginPatterns(List.of(origin.split(",")));
        cors.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("*"));
        cors.setExposedHeaders(List.of("Content-Disposition"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cors);
        return source;
    }

    // The JWT filter runs inside the security chain only, not a second time as a plain servlet filter
    @Bean
    FilterRegistrationBean<JwtAuthFilter> jwtFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static void writeError(HttpServletResponse res, ObjectMapper mapper, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), new ErrorResponse(message));
    }
}
