package com.example.demo.service.ai;

import com.example.demo.config.AiProperties;
import com.example.demo.dto.AiChatRequest;
import com.example.demo.dto.AiChatResponse;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class QwenLocalClient implements AiProviderClient {

    private final AiProperties.ProviderProps props;
    private final RestTemplate restTemplate = new RestTemplate();

    public QwenLocalClient(AiProperties.ProviderProps props) {
        this.props = props;
    }

    @Override
    public String getId() {
        return "qwen-local";
    }

    @Override
    public boolean isLocal() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return props.isEnabled();
    }

    @Override
    public AiChatResponse chat(AiChatRequest request) {
        String url = props.getUrl();
        if (url == null || url.isBlank()) {
            throw new IllegalStateException("Qwen local URL is not configured (ai.providers.local-qwen.url)");
        }

        String model = props.getModel() != null && !props.getModel().isBlank()
                ? props.getModel()
                : "qwen";

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", request.getMessage()
                        )
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        Map<String, Object> resp = restTemplate.postForObject(url, entity, Map.class);

        if (resp == null) {
            throw new IllegalStateException("Empty response from Qwen local service");
        }

        List<Object> choices = (List<Object>) resp.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("No choices in Qwen response: " + resp);
        }

        Map<String, Object> firstChoice = (Map<String, Object>) choices.get(0);
        Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
        String content = message != null ? (String) message.get("content") : null;

        if (content == null) {
            throw new IllegalStateException("No content in Qwen response: " + resp);
        }

        AiChatResponse r = new AiChatResponse();
        r.setAssistantId(getId());
        r.setResponse(content);
        return r;
    }
}
