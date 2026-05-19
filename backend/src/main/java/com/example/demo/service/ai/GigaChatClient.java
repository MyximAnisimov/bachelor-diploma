package com.example.demo.service.ai;

import com.example.demo.config.AiProperties;
import com.example.demo.dto.request.AiChatRequest;
import com.example.demo.dto.response.AiChatResponse;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@SuppressWarnings("unchecked")
public class GigaChatClient implements AiProviderClient {

    private final AiProperties.ProviderProps props;
    private final RestTemplate restTemplate = new RestTemplate();

    private String accessToken;
    private long accessTokenExpiresAt = 0L;

    public GigaChatClient(AiProperties.ProviderProps props) {
        this.props = props;
    }

    @Override
    public String getId() {
        return "gigachat";
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
        String apiBaseUrl = props.getUrl();
        if (apiBaseUrl == null || apiBaseUrl.isBlank()) {
            throw new IllegalStateException("GigaChat API URL is not configured (ai.providers.gigachat.url)");
        }

        String model = (props.getModel() != null && !props.getModel().isBlank())
                ? props.getModel()
                : "GigaChat";

        String token = getAccessToken();

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
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(token);

        headers.set("X-Request-ID", UUID.randomUUID().toString());
        headers.set("X-Client-ID", "demo-client");
        headers.set("X-Session-ID", UUID.randomUUID().toString());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        String url = apiBaseUrl.endsWith("/")
                ? apiBaseUrl + "api/v1/chat/completions"
                : apiBaseUrl + "/api/v1/chat/completions";

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = restTemplate.postForObject(url, entity, Map.class);
        if (resp == null) {
            throw new IllegalStateException("Empty response from GigaChat service");
        }

        @SuppressWarnings("unchecked")
        List<Object> choices = (List<Object>) resp.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new IllegalStateException("No choices in GigaChat response: " + resp);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> firstChoice = (Map<String, Object>) choices.get(0);
        @SuppressWarnings("unchecked")
        Map<String, Object> message = (Map<String, Object>) firstChoice.get("message");
        String content = message != null ? (String) message.get("content") : null;

        if (content == null) {
            throw new IllegalStateException("No content in GigaChat response: " + resp);
        }

        AiChatResponse r = new AiChatResponse();
        r.setAssistantId(getId());
        r.setResponse(content);
        return r;
    }

    private String getAccessToken() {
        long now = System.currentTimeMillis();
        if (accessToken != null && now < accessTokenExpiresAt - 10_000) {
            return accessToken;
        }

        String clientId = props.getClientId();
        String scope = props.getScope();
        String authorizationKey = props.getAuthorizationKey();
        String ngwUrl = props.getNgwUrl();

        if (clientId == null || clientId.isBlank()) {
            throw new IllegalStateException("GigaChat clientId is not configured");
        }
        if (authorizationKey == null || authorizationKey.isBlank()) {
            throw new IllegalStateException("GigaChat authorizationKey is not configured");
        }
        if (ngwUrl == null || ngwUrl.isBlank()) {
            throw new IllegalStateException("GigaChat NGW url is not configured (ai.providers.gigachat.ngw-url)");
        }

        String tokenUrl = ngwUrl.endsWith("/")
                ? ngwUrl + "api/v2/oauth"
                : ngwUrl + "/api/v2/oauth";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("RqUID", UUID.randomUUID().toString());

        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + authorizationKey);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("scope", scope != null ? scope : "GIGACHAT_API_PERS");

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(body, headers);

        Map<String, Object> resp = restTemplate.postForObject(tokenUrl, entity, Map.class);
        if (resp == null) {
            throw new IllegalStateException("Empty token response from GigaChat");
        }

        String token = (String) resp.get("access_token");
        Number expiresIn = (Number) resp.get("expires_in");
        if (token == null) {
            throw new IllegalStateException("No access_token in GigaChat token response: " + resp);
        }

        accessToken = token;
        accessTokenExpiresAt = System.currentTimeMillis() +
                (expiresIn != null ? expiresIn.longValue() * 1000L : 3600_000L);
        return accessToken;
    }
}
