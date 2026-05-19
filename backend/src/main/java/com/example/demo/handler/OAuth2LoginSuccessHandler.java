package com.example.demo.handler;

import com.example.demo.model.User;
import com.example.demo.model.User.AuthProvider;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtService;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public OAuth2LoginSuccessHandler(UserRepository userRepository,
                                     JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException, ServletException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        String registrationId = token.getAuthorizedClientRegistrationId(); // "yandex"
        OAuth2User oAuth2User = token.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        System.out.println("OAUTH2 ATTRIBUTES (" + registrationId + "): " + attributes);

        if ("yandex".equals(registrationId)) {
            handleYandexLogin(attributes, response);
        } else {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                    "Unsupported OAuth2 provider: " + registrationId);
        }
    }

    private void handleYandexLogin(Map<String, Object> attributes,
                                   HttpServletResponse response) throws IOException {

        String yandexId = (String) attributes.get("id");
        String login = (String) attributes.get("login");
        String realName = (String) attributes.get("real_name");
        String email = (String) attributes.get("default_email");

        String displayName = realName != null && !realName.isBlank()
                ? realName
                : (login != null ? login : (email != null ? email : "Yandex User"));

        User user = userRepository
                .findByProviderAndExternalId(AuthProvider.YANDEX, yandexId)
                .orElseGet(() -> {
                    User u = new User();
                    u.setProvider(AuthProvider.YANDEX);
                    u.setExternalId(yandexId);
                    u.setEmail(email != null ? email : ("yandex_" + yandexId + "@local"));
                    u.setDisplayName(displayName);
                    return userRepository.save(u);
                });

        String jwt = jwtService.generateToken(user);

        String redirectUrl = "https://192.168.0.4:5173/oauth2/success?token=" +
                URLEncoder.encode(jwt, StandardCharsets.UTF_8);
        response.sendRedirect(redirectUrl);
    }
}