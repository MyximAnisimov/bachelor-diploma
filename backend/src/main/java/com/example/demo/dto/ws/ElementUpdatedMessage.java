package com.example.demo.dto.ws;

import com.example.demo.dto.BoardElementDto;
import lombok.Data;

import java.util.UUID;

@Data
public class ElementUpdatedMessage {
    private UUID boardUuid;
    private BoardElementDto element;
    private String clientId;
    private String action;
}
