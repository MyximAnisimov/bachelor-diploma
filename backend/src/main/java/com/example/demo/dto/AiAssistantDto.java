package com.example.demo.dto;


import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AiAssistantDto {
    private String id;           // например: "chatgpt", "gigachat", "ds", "qwen-local"
    private String name;         // "ChatGPT", "GigaChat", "DS Assistant", "Qwen (локально)"
    private String description;  // краткое пояснение
    private boolean local;       // true для локальных моделей
    private boolean available;   // включен ли сейчас
}
