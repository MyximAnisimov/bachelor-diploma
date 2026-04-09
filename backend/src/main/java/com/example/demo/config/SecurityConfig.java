package com.example.demo.config;

import com.example.demo.handler.OAuth2LoginSuccessHandler;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtAuthenticationFilter;
import com.example.demo.service.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler(
            UserRepository userRepository,
            JwtService jwtService
    ) {
        return new OAuth2LoginSuccessHandler(userRepository, jwtService);
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtFilter,
            OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler
    ) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        })
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/boards/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/boards/*/elements").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/boards/*/elements").permitAll()
                        .requestMatchers(HttpMethod.PATCH, "/api/boards/*/elements/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/boards/*/elements/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/boards").authenticated()

                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()

                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth -> oauth
                        .successHandler(oAuth2LoginSuccessHandler)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}