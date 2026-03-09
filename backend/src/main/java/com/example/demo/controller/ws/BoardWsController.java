package com.example.demo.controller.ws;

import com.example.demo.dto.ws.CursorMessage;
import com.example.demo.dto.ws.ElementLockMessage;
import com.example.demo.service.ElementLockService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
public class BoardWsController {

    private final ElementLockService lockService;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardWsController(ElementLockService lockService,
                             SimpMessagingTemplate messagingTemplate) {
        this.lockService = lockService;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/board.lock")
    public void handleLock(ElementLockMessage msg) {
        UUID boardUuid = msg.getBoardUuid();
        boolean success;

        if ("LOCK".equalsIgnoreCase(msg.getAction())) {
            success = lockService.lockElements(
                    boardUuid,
                    msg.getElementIds(),
                    msg.getClientId()
            );
            if (!success) {
                msg.setError("Elements already locked by another user");
            }
        } else {
            lockService.unlockElements(
                    boardUuid,
                    msg.getElementIds(),
                    msg.getClientId()
            );
            success = true;
        }

        msg.setSuccess(success);

        messagingTemplate.convertAndSend(
                "/topic/boards/" + boardUuid + "/locks",
                msg
        );
    }

    @MessageMapping("/board.cursor")
    public void handleCursor(CursorMessage msg) {
        messagingTemplate.convertAndSend(
                "/topic/boards/" + msg.getBoardUuid() + "/cursors",
                msg
        );
    }
}
