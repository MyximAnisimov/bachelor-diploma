package com.example.demo.service;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class DailyService {

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String apiBaseUrl;

    public DailyService(
            RestTemplate restTemplate,
            @Value("${daily.api-key}") String apiKey
    ) {
        this.restTemplate = restTemplate;
        this.apiKey = apiKey;
        this.apiBaseUrl = "https://api.daily.co/v1";
    }

    public DailyRoomDto createRoomForBoard(String boardUuid) {
        String roomName = "board-" + boardUuid + "-" +
                UUID.randomUUID().toString().substring(0, 6);

        Map<String, Object> properties = new HashMap<>();
        properties.put("enable_screenshare", true);
        properties.put("enable_chat", true);

        Map<String, Object> body = new HashMap<>();
        body.put("name", roomName);
        body.put("properties", properties);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<DailyRoomDto> response = restTemplate.exchange(
                apiBaseUrl + "/rooms",
                HttpMethod.POST,
                entity,
                DailyRoomDto.class
        );

        return response.getBody();
    }

    public static class DailyRoomDto {
        private String id;
        private String name;
        private String url;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
    }
}
