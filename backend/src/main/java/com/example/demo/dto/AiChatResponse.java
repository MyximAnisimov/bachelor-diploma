package com.example.demo.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AiChatResponse {
    private String assistantId;
    private String response;

    // можно добавить usage, errorMessage и т.п.
    // геттеры/сеттеры
}
