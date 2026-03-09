package com.example.demo.dto.ws;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ElementLockMessage {
    private UUID boardUuid;
    private List<Long> elementIds;
    private String clientId;

    private String action;

    private boolean success;
    private String error;
}
