package com.example.demo.dto;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class BoardDto {
    private UUID uuid;
    private String title;
    private boolean temporary;

    private Instant createdAt;
    private Instant updatedAt;
}

