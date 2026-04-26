package com.example.demo.service;

import com.example.demo.dto.BoardElementDto;
import com.example.demo.mapper.BoardElementMapper;
import com.example.demo.model.Board;
import com.example.demo.model.BoardElement;
import com.example.demo.model.BoardVersion;
import com.example.demo.model.User;
import com.example.demo.repository.BoardElementRepository;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.BoardVersionRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardVersionService {

    private final BoardRepository boardRepository;
    private final BoardElementRepository elementRepository;
    private final BoardVersionRepository versionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final BoardService boardService;
    private final BoardElementMapper elementMapper;

    public static class BoardSnapshot {
        public List<BoardElementDto> elements;
    }

    private User getCurrentUser(Principal principal) {
        if (principal == null) {
            throw new IllegalStateException("Пользователь не аутентифицирован");
        }
        String email = principal.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Пользователь не найден: " + email));
    }

    @Transactional(readOnly = true)
    public List<BoardVersion> listVersions(UUID boardUuid) {
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));
        return versionRepository.findByBoardIdOrderByCreatedAtDesc(board.getId());
    }

    @Transactional
    public BoardVersion createVersion(UUID boardUuid,
                                      String label,
                                      Principal principal) throws JsonProcessingException {
        User currentUser = getCurrentUser(principal);
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        if (!boardService.canView(board, currentUser)) {
            throw new SecurityException("Нет доступа к доске");
        }

        List<BoardElement> elements = elementRepository.findAllByBoard(board);
        List<BoardElementDto> elementDtos = elements.stream()
                .map(elementMapper::toDto)
                .toList();

        BoardSnapshot snapshot = new BoardSnapshot();
        snapshot.elements = elementDtos;
        String payloadJson = objectMapper.writeValueAsString(snapshot);

        BoardVersion version = new BoardVersion();
        version.setBoard(board);
        version.setBoardUuid(board.getUuid());
        version.setCreatedAt(Instant.now());
        version.setCreatedBy(currentUser);
        version.setLabel(label);
        version.setPayloadJson(payloadJson);

        return versionRepository.save(version);
    }

    @Transactional
    public List<BoardElementDto> restoreVersionAndGetDto(UUID boardUuid,
                                                         Long versionId,
                                                         Principal principal) throws Exception {
        User currentUser = getCurrentUser(principal);
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        if (!boardService.canEdit(board, currentUser)) {
            throw new SecurityException("Нет прав редактировать эту доску");
        }

        BoardVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Версия не найдена"));

        if (!version.getBoard().getId().equals(board.getId())) {
            throw new IllegalArgumentException("Версия не принадлежит этой доске");
        }

        BoardSnapshot snapshot = objectMapper.readValue(
                version.getPayloadJson(),
                BoardSnapshot.class
        );

        List<BoardElement> current = elementRepository.findAllByBoard(board);
        elementRepository.deleteAllInBatch(current);

        List<BoardElement> restored = snapshot.elements.stream()
                .map(dto -> {
                    BoardElement el = new BoardElement();
                    el.setBoard(board);
                    el.setType(dto.getType());
                    el.setX(dto.getX());
                    el.setY(dto.getY());
                    el.setWidth(dto.getWidth());
                    el.setHeight(dto.getHeight());
                    el.setRotation(dto.getRotation());
                    el.setZIndex(dto.getZIndex());
                    el.setLockedPosition(dto.isLockedPosition());
                    el.setLockedEditing(dto.isLockedEditing());
                    try {
                        el.setPropertiesJson(
                                dto.getProperties() != null
                                        ? objectMapper.writeValueAsString(dto.getProperties())
                                        : "{}"
                        );
                    } catch (JsonProcessingException e) {
                        throw new RuntimeException(e);
                    }
                    el.setCreatedAt(Instant.now());
                    el.setUpdatedAt(Instant.now());
                    return el;
                })
                .toList();

        List<BoardElement> saved = elementRepository.saveAll(restored);

        return saved.stream()
                .map(elementMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BoardElementDto> getVersionSnapshot(UUID boardUuid,
                                                    Long versionId,
                                                    Principal principal) throws Exception {
        User currentUser = getCurrentUser(principal);
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        if (!boardService.canView(board, currentUser)) {
            throw new SecurityException("Нет доступа к доске");
        }

        BoardVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Версия не найдена"));

        if (!version.getBoard().getId().equals(board.getId())) {
            throw new IllegalArgumentException("Версия не принадлежит этой доске");
        }

        String json = version.getPayloadJson();
        if (json == null || json.isBlank() || !json.trim().startsWith("{")) {
            throw new IllegalStateException("Версия содержит некорректный снимок доски");
        }

        BoardSnapshot snapshot = objectMapper.readValue(json, BoardSnapshot.class);

        return snapshot.elements;
    }
}