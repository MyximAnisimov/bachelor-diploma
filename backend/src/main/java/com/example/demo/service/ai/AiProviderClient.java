package com.example.demo.service.ai;

import com.example.demo.dto.request.AiChatRequest;
import com.example.demo.dto.response.AiChatResponse;

public interface AiProviderClient {
    String getId();

    boolean isLocal();

    boolean isEnabled();

    AiChatResponse chat(AiChatRequest request);
}
