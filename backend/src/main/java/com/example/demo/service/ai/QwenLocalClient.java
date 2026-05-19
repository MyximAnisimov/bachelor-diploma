package com.example.demo.service.ai;

import com.example.demo.config.AiProperties;
import com.example.demo.dto.request.AiChatRequest;
import com.example.demo.dto.response.AiChatResponse;
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
        String baseUrl = props.getUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new IllegalStateException("Qwen base URL is not configured (ai.providers.qwen-local.url)");
        }

        String model = (props.getModel() != null && !props.getModel().isBlank())
                ? props.getModel()
                : "qwen2:4b";

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", request.getMessage()
                        )
                ),
                "stream", false
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        String url = baseUrl.endsWith("/")
                ? baseUrl + "api/chat"
                : baseUrl + "/api/chat";

        Map<String, Object> resp = restTemplate.postForObject(url, entity, Map.class);
        if (resp == null) {
            throw new IllegalStateException("Empty response from Qwen local service");
        }

        Map<String, Object> msg = (Map<String, Object>) resp.get("message");
        if (msg == null) {
            throw new IllegalStateException("No 'message' in Qwen response: " + resp);
        }

        String content = (String) msg.get("content");
        if (content == null) {
            throw new IllegalStateException("No 'content' in Qwen response: " + resp);
        }

        AiChatResponse r = new AiChatResponse();
        r.setAssistantId(getId());
        r.setResponse(content);
        return r;
    }
}
