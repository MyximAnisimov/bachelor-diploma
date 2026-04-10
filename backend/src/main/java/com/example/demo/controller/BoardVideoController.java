package com.example.demo.controller;

import com.example.demo.service.DailyService;
import lombok.Getter;
import lombok.Setter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Instant;

@RestController
@RequestMapping("/api/boards")
public class BoardVideoController {

    private final DailyService dailyService;
    private final SimpMessagingTemplate messagingTemplate;

    public BoardVideoController(DailyService dailyService,
                                SimpMessagingTemplate messagingTemplate) {
        this.dailyService = dailyService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/{boardUuid}/video-room")
    public DailyRoomCreatedResponse createVideoRoom(
            @PathVariable String boardUuid,
            Principal principal
    ) {
        DailyService.DailyRoomDto room = dailyService.createRoomForBoard(boardUuid);

        String createdBy = principal != null ? principal.getName() : "anonymous";

        BoardCallCreatedMessage msg = new BoardCallCreatedMessage();
        msg.setType("CALL_CREATED");
        msg.setBoardUuid(boardUuid);
        msg.setRoomName(room.getName());
        msg.setRoomUrl(room.getUrl());
        msg.setCreatedBy(createdBy);
        msg.setCreatedAt(Instant.now().toString());

        messagingTemplate.convertAndSend(
                "/topic/boards/" + boardUuid + "/call",
                msg
        );

        DailyRoomCreatedResponse resp = new DailyRoomCreatedResponse();
        resp.setName(room.getName());
        resp.setUrl(room.getUrl());
        return resp;
    }

    @Getter
    @Setter
    public static class BoardCallCreatedMessage {
        private String type;
        private String boardUuid;
        private String roomName;
        private String roomUrl;
        private String createdBy;
        private String createdAt;
    }

    @Getter
    @Setter
    public static class DailyRoomCreatedResponse {
        private String name;
        private String url;
    }
}