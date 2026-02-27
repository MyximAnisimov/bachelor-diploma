package com.example.demo.security;

import com.example.demo.model.User;

import java.util.Optional;

public interface AuthUser {
    Optional<User> getCurrentUser();
}
