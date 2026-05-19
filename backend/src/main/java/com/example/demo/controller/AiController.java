package com.example.demo.controller;

import com.example.demo.dto.AiAssistantDto;
import com.example.demo.dto.request.AiChatRequest;
import com.example.demo.dto.response.AiChatResponse;
import com.example.demo.service.ai.AiGatewayService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiGatewayService aiGatewayService;

    public AiController(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    @GetMapping("/assistants")
    public List<AiAssistantDto> listAssistants() {
        return aiGatewayService.listAssistants();
    }

    @PostMapping("/chat")
    public AiChatResponse chat(@RequestBody AiChatRequest request) {
        return aiGatewayService.chat(request);
    }
}
