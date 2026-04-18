package com.example.demo.service.ai;

import com.example.demo.config.AiProperties;
import com.example.demo.dto.AiChatRequest;
import com.example.demo.dto.AiChatResponse;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

public class ChatGptClient implements AiProviderClient {

    private final AiProperties.ProviderProps props;
    private final RestTemplate restTemplate = new RestTemplate();

    public ChatGptClient(AiProperties.ProviderProps props) {
        this.props = props;
    }

    @Override
    public String getId() {
        return "chatgpt";
    }

    @Override
    public boolean isLocal() {
        return false;
    }

    @Override
    public boolean isEnabled() {
        return props.isEnabled();
    }

    @Override
    public AiChatResponse chat(AiChatRequest request) {
        String url = "https://api.openai.com/v1/chat/completions";

        Map<String, Object> body = Map.of(
                "model", props.getModel(),
                "messages", List.of(
                        Map.of("role", "user", "content", buildPrompt(request))
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(props.getApiKey());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        Map<String, Object> resp = restTemplate.postForObject(url, entity, Map.class);

        String content = ((Map<String, Object>) ((Map<String, Object>)
                ((List<Object>) resp.get("choices")).get(0))
                .get("message")).get("content").toString();

        AiChatResponse r = new AiChatResponse();
        r.setAssistantId(getId());
        r.setResponse(content);
        return r;
    }

    private String buildPrompt(AiChatRequest request) {
        return request.getMessage();
    }
}
