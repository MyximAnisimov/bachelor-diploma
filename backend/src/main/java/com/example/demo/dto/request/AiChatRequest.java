package com.example.demo.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class AiChatRequest {
    private String assistantId;
    private String boardUuid;
    private String message;
    private Map<String, Object> context;
}
