package com.example.demo.service.ai;

import com.example.demo.dto.AiChatRequest;
import com.example.demo.dto.AiChatResponse;

public interface AiProviderClient {
    String getId();

    boolean isLocal();

    boolean isEnabled();

    AiChatResponse chat(AiChatRequest request);
}
