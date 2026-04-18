package com.example.demo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Map;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    private boolean allowExternal = true;

    private Map<String, ProviderProps> providers;

    @Getter
    @Setter
    public static class ProviderProps {
        private boolean enabled = true;
        private String apiKey;
        private String model;
        private String url;

        private String clientId;
        private String scope;
        private String authorizationKey;
        private String ngwUrl;
    }
}
