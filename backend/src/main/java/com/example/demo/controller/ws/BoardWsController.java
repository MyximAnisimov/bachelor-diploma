package com.example.demo.controller.ws;

import com.example.demo.dto.ws.BoardStateMessage;
import com.example.demo.dto.ws.CursorMessage;
import com.example.demo.dto.ws.ElementLockMessage;
import com.example.demo.model.Board;
import com.example.demo.model.User;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.BoardService;
import com.example.demo.service.ElementLockService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class BoardWsController {

    private final ElementLockService lockService;
    private final SimpMessagingTemplate messagingTemplate;
    private final BoardRepository boardRepository;
    private final BoardService boardService;
    private final UserRepository userRepository;

    public BoardWsController(ElementLockService lockService,
                             SimpMessagingTemplate messagingTemplate,
                             BoardRepository boardRepository,
                             BoardService boardService,
                             UserRepository userRepository) {
        this.lockService = lockService;
        this.messagingTemplate = messagingTemplate;
        this.boardRepository = boardRepository;
        this.boardService = boardService;
        this.userRepository = userRepository;
    }

    private User getCurrentUserOrNull(Principal principal) {
        if (!(principal instanceof Authentication auth)) {
            return null;
        }
        Object p = auth.getPrincipal();
        if (p instanceof User u) {
            return u;
        }
        if (p instanceof UserDetails ud) {
            return userRepository.findByEmail(ud.getUsername()).orElse(null);
        }
        return null;
    }

    @MessageMapping("/board.lock")
    public void handleLock(ElementLockMessage msg, Principal principal) {

        Board board = boardRepository.findByUuid(msg.getBoardUuid())
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        User currentUserOrNull = getCurrentUserOrNull(principal);

        if (!boardService.canEdit(board, currentUserOrNull)) {
            return;
        }

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

    @MessageMapping("/boards/{boardUuid}/state")
    @SendTo("/topic/boards/{boardUuid}/state")
    public BoardStateMessage handleState(
            @DestinationVariable UUID boardUuid,
            BoardStateMessage message
    ) {
        return message;
    }
}
