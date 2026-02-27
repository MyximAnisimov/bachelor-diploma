package com.example.demo.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User {

    public enum AuthProvider {
        GOOGLE, YANDEX, VK, APPLE, T_BANK, LOCAL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String externalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Column(nullable = false)
    private String displayName;

    private String email;

    private String avatarUrl;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

}
