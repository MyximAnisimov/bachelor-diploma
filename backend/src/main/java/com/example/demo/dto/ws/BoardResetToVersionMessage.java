package com.example.demo.dto.ws;

import com.example.demo.dto.BoardElementDto;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class BoardResetToVersionMessage {

    private String type = "BOARD_RESET_TO_VERSION";

    private Payload payload;

    @Getter
    @Setter
    public static class Payload {
        private Long versionId;
        private UUID boardUuid;
        private List<BoardElementDto> elements;
        private Instant restoredAt;
    }
}
