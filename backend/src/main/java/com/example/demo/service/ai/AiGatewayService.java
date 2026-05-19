package com.example.demo.service.ai;

import com.example.demo.config.AiProperties;
import com.example.demo.dto.AiAssistantDto;
import com.example.demo.dto.request.AiChatRequest;
import com.example.demo.dto.response.AiChatResponse;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiGatewayService {

    private final AiProperties aiProperties;
    private final Map<String, AiProviderClient> clients = new HashMap<>();

    public AiGatewayService(AiProperties aiProperties) {
        this.aiProperties = aiProperties;
        Map<String, AiProperties.ProviderProps> p = aiProperties.getProviders();
        if (p.containsKey("gigachat")) {
            clients.put("gigachat", new GigaChatClient(p.get("gigachat")));
        }
        if (p.containsKey("qwen-local")) {
            clients.put("qwen-local", new QwenLocalClient(p.get("qwen-local")));
        }
    }

    public List<AiAssistantDto> listAssistants() {
        List<AiAssistantDto> result = new ArrayList<>();
        for (AiProviderClient client : clients.values()) {
            AiAssistantDto dto = new AiAssistantDto();
            dto.setId(client.getId());
            switch (client.getId()) {
                case "gigachat" -> dto.setName("GigaChat");
                case "local-qwen" -> dto.setName("Qwen (локальная)");
            }
            dto.setDescription(client.isLocal()
                    ? "Локально развёрнутая модель, данные не покидают сервер."
                    : "Внешний LLM-сервис.");
            dto.setLocal(client.isLocal());
            dto.setAvailable(client.isEnabled() && (aiProperties.isAllowExternal() || client.isLocal()));
            result.add(dto);
        }
        return result;
    }

    public AiChatResponse chat(AiChatRequest request) {
        AiProviderClient client = clients.get(request.getAssistantId());
        if (client == null || !client.isEnabled()) {
            throw new IllegalArgumentException("Assistant not available: " + request.getAssistantId());
        }
        if (!aiProperties.isAllowExternal() && !client.isLocal()) {
            throw new IllegalStateException("External providers are disabled");
        }
        return client.chat(request);
    }
}
