package com.example.demo.dto;

import com.example.demo.model.BoardAccessMode;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardDto {
    private UUID uuid;
    private String title;
    private boolean temporary;

    private Instant createdAt;
    private Instant updatedAt;
    BoardAccessMode accessMode;
    Long ownerId;
}

