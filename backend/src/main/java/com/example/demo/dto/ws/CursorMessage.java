package com.example.demo.dto.ws;

import lombok.Data;

import java.util.UUID;

@Data
public class CursorMessage {
    private UUID boardUuid;
    private String clientId;
    private double x;
    private double y;
    private String displayName;
}
