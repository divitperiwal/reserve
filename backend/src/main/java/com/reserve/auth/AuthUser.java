package com.reserve.auth;

import com.reserve.user.Role;

public record AuthUser(Long id, Role role) {
}
