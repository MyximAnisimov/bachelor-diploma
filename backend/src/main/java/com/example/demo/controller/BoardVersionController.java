package com.example.demo.controller;

import com.example.demo.dto.BoardElementDto;
import com.example.demo.dto.ws.BoardResetToVersionMessage;
import com.example.demo.model.BoardVersion;
import com.example.demo.service.BoardVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards/{boardUuid}/versions")
@RequiredArgsConstructor
public class BoardVersionController {

    private final BoardVersionService boardVersionService;
    private final SimpMessagingTemplate messagingTemplate;

    public record BoardVersionDto(
            Long id,
            UUID boardUuid,
            Instant createdAt,
            Long createdById,
            String label
    ) {
        public static BoardVersionDto fromEntity(BoardVersion v) {
            Long createdById = v.getCreatedBy() != null ? v.getCreatedBy().getId() : null;
            return new BoardVersionDto(
                    v.getId(),
                    v.getBoardUuid(),
                    v.getCreatedAt(),
                    createdById,
                    v.getLabel()
            );
        }
    }

    public record CreateVersionRequest(String label) {}

    @GetMapping
    public List<BoardVersionDto> listVersions(@PathVariable UUID boardUuid) {
        return boardVersionService.listVersions(boardUuid).stream()
                .map(BoardVersionDto::fromEntity)
                .toList();
    }

    @PostMapping
    public ResponseEntity<BoardVersionDto> createVersion(
            @PathVariable UUID boardUuid,
            @RequestBody(required = false) CreateVersionRequest body,
            Principal principal
    ) throws Exception {
        String label = body != null ? body.label() : null;
        BoardVersion version = boardVersionService.createVersion(boardUuid, label, principal);
        return ResponseEntity.ok(BoardVersionDto.fromEntity(version));
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<?> restoreVersion(
            @PathVariable UUID boardUuid,
            @PathVariable Long versionId,
            Principal principal
    ) throws Exception {
        List<BoardElementDto> restored = boardVersionService
                .restoreVersionAndGetDto(boardUuid, versionId, principal);

        BoardResetToVersionMessage msg = new BoardResetToVersionMessage();
        BoardResetToVersionMessage.Payload payload = new BoardResetToVersionMessage.Payload();
        payload.setVersionId(versionId);
        payload.setBoardUuid(boardUuid);
        payload.setElements(restored);
        payload.setRestoredAt(Instant.now());
        msg.setPayload(payload);

        messagingTemplate.convertAndSend(
                "/topic/boards/" + boardUuid + "/state",
                msg
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{versionId}/preview")
    public List<BoardElementDto> previewVersion(
            @PathVariable UUID boardUuid,
            @PathVariable Long versionId,
            Principal principal
    ) throws Exception {
        return boardVersionService.getVersionSnapshot(boardUuid, versionId, principal);
    }
}