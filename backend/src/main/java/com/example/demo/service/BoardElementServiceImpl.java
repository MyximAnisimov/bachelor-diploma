package com.example.demo.service;

import com.example.demo.dto.request.BoardElementCreateRequest;
import com.example.demo.dto.BoardElementDto;
import com.example.demo.dto.request.BoardElementUpdateRequest;
import com.example.demo.dto.request.CopyElementsRequest;
import com.example.demo.dto.response.CopyElementsResponse;
import com.example.demo.dto.request.ElementLockRequest;
import com.example.demo.dto.ElementOrderDto;
import com.example.demo.dto.request.ElementTransformRequest;
import com.example.demo.dto.request.GroupElementsRequest;
import com.example.demo.dto.response.GroupElementsResponse;
import com.example.demo.dto.request.ReorderElementsRequest;
import com.example.demo.dto.request.UngroupElementsRequest;
import com.example.demo.dto.ws.ElementUpdatedMessage;
import com.example.demo.exception.NotFoundException;
import com.example.demo.mapper.BoardElementMapper;
import com.example.demo.model.Board;
import com.example.demo.model.BoardElement;
import com.example.demo.model.BoardHistoryEvent;
import com.example.demo.model.ElementGroup;
import com.example.demo.model.User;
import com.example.demo.repository.BoardElementRepository;
import com.example.demo.repository.BoardHistoryEventRepository;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.ElementGroupRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ValidationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardElementServiceImpl implements BoardElementService {

    private final BoardRepository boardRepository;
    private final BoardElementRepository elementRepository;
    private final ElementGroupRepository groupRepository;
    private final BoardHistoryEventRepository historyRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ElementLockService elementLockService;

    private final BoardElementMapper elementMapper;
    private final ObjectMapper objectMapper;
    private final BoardService boardService;
    private final UserRepository userRepository;

    private Board getBoardOrThrow(UUID boardUuid) {
        return boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new NotFoundException("Board not found: " + boardUuid));
    }

    private BoardElement getElementForBoardOrThrow(Board board, Long elementId) {
        BoardElement element = elementRepository.findById(elementId)
                .orElseThrow(() -> new NotFoundException("Element not found: " + elementId));

        if (!element.getBoard().getId().equals(board.getId())) {
            throw new ValidationException("Element " + elementId + " does not belong to board " + board.getId());
        }
        return element;
    }

    private String toJsonSafe(Object obj) {
        if (obj == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private void saveHistory(Board board,
                             Long elementId,
                             BoardHistoryEvent.EventType eventType,
                             Object beforeState,
                             Object afterState) {

        BoardHistoryEvent event = new BoardHistoryEvent();
        event.setBoard(board);
        event.setElementId(elementId);
        event.setEventType(eventType);
        event.setBeforeStateJson(toJsonSafe(beforeState));
        event.setAfterStateJson(toJsonSafe(afterState));
        event.setCreatedAt(Instant.now());

        historyRepository.save(event);
    }

    private int calcNextZIndex(Board board) {
        Integer maxZ = elementRepository.findMaxZIndexByBoard(board);
        return (maxZ == null ? 0 : maxZ + 1);
    }

    @Override
    public List<BoardElementDto> getElementsByBoardUuid(UUID boardUuid) {
        Board board = getBoardOrThrow(boardUuid);
        List<BoardElement> elements = elementRepository.findAllByBoard(board);
        return elements.stream()
                .map(elementMapper::toDto)
                .collect(Collectors.toList());
    }

    private User getCurrentUserOrNull() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null ||
                "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User u) {
            return u;
        }
        if (principal instanceof UserDetails ud) {
            return userRepository.findByEmail(ud.getUsername()).orElse(null);
        }
        return null;
    }

    @Override
    @Transactional
    public BoardElementDto createElement(UUID boardUuid, BoardElementCreateRequest request) {
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        User currentUserOrNull = getCurrentUserOrNull();
        log.info("createElement: board={}, mode={}, ownerId={}, currentUserId={}",
                board.getUuid(), board.getAccessMode(),
                board.getOwner() != null ? board.getOwner().getId() : null,
                currentUserOrNull != null ? currentUserOrNull.getId() : null
        );

        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }


        BoardElement element = new BoardElement();
        element.setBoard(board);
        element.setType(request.getType());
        element.setX(request.getX());
        element.setY(request.getY());
        element.setWidth(request.getWidth());
        element.setHeight(request.getHeight());
        element.setRotation(request.getRotation() != null ? request.getRotation() : 0.0);
        element.setZIndex(request.getZIndex() != null ? request.getZIndex() : calcNextZIndex(board));

        if (request.getGroupId() != null) {
            UUID groupUuid = UUID.fromString(request.getGroupId());
            ElementGroup group = groupRepository
                    .findByUuidAndBoardUuid(groupUuid, boardUuid)
                    .orElseThrow(() -> new ValidationException("Group not found: " + request.getGroupId()));
            element.setGroup(group);
        }

        if (request.getMediaId() != null) {
        }

        if (request.getProperties() != null) {
            element.setPropertiesJson(toJsonSafe(request.getProperties()));
        } else {
            element.setPropertiesJson("{}");
        }

        element.setCreatedAt(Instant.now());
        element.setUpdatedAt(Instant.now());

        elementRepository.save(element);

        BoardElementDto dto = elementMapper.toDto(element);

        ElementUpdatedMessage msg = new ElementUpdatedMessage();
        msg.setBoardUuid(boardUuid);
        msg.setElement(dto);
        msg.setAction("UPSERT");

        messagingTemplate.convertAndSend(
                "/topic/boards/" + boardUuid + "/elements",
                msg
        );
        saveHistory(board, element.getId(), BoardHistoryEvent.EventType.ELEMENT_CREATED, null, dto);

        return dto;
    }

    @Override
    @Transactional
    public BoardElementDto updateElement(UUID boardUuid,
                                         Long elementId,
                                         BoardElementUpdateRequest request) {
        BoardElement element = elementRepository.findById(elementId)
                .orElseThrow(() -> new IllegalArgumentException("Элемент не найден"));

        Board board = element.getBoard();
        User currentUserOrNull = getCurrentUserOrNull();

        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        BoardElementDto beforeDto = elementMapper.toDto(element);

        if (request.getX() != null) element.setX(request.getX());
        if (request.getY() != null) element.setY(request.getY());
        if (request.getWidth() != null) element.setWidth(request.getWidth());
        if (request.getHeight() != null) element.setHeight(request.getHeight());
        if (request.getRotation() != null) element.setRotation(request.getRotation());

        if (request.getZIndex() != null) element.setZIndex(request.getZIndex());

        if (request.getGroupId() != null) {
            if (request.getGroupId().isEmpty()) {
                element.setGroup(null);
            } else {
                UUID groupUuid = UUID.fromString(request.getGroupId());
                ElementGroup group = groupRepository
                        .findByUuidAndBoardUuid(groupUuid, boardUuid)
                        .orElseThrow(() -> new ValidationException("Group not found: " + request.getGroupId()));
                element.setGroup(group);
            }
        }

        if (request.getLockedPosition() != null) {
            element.setLockedPosition(request.getLockedPosition());
        }
        if (request.getLockedEditing() != null) {
            element.setLockedEditing(request.getLockedEditing());
        }

        if (request.getMediaId() != null) {
        }

        if (request.getProperties() != null) {
            element.setPropertiesJson(toJsonSafe(request.getProperties()));
        }

        element.setUpdatedAt(Instant.now());

        elementRepository.save(element);

        BoardElementDto afterDto = elementMapper.toDto(element);
        saveHistory(board, element.getId(), BoardHistoryEvent.EventType.ELEMENT_UPDATED, beforeDto, afterDto);

        return afterDto;
    }

    @Override
    @Transactional
    public BoardElementDto transformElement(UUID boardUuid,
                                            Long elementId,
                                            ElementTransformRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        BoardElement element = getElementForBoardOrThrow(board, elementId);

        elementLockService.getLockOwner(boardUuid, elementId).ifPresent(owner -> {
            if (!owner.equals(request.getClientId())) {
                throw new ValidationException("Element is locked by another user");
            }
        });

        BoardElementDto beforeDto = elementMapper.toDto(element);
        element.setX(request.getX());
        element.setY(request.getY());
        element.setWidth(request.getWidth());
        element.setHeight(request.getHeight());
        element.setRotation(request.getRotation());
        element.setUpdatedAt(Instant.now());
        if (request.getProperties() != null) {
            element.setPropertiesJson(toJsonSafe(request.getProperties()));
        }
        elementRepository.save(element);

        BoardElementDto afterDto = elementMapper.toDto(element);

        ElementUpdatedMessage msg = new ElementUpdatedMessage();
        msg.setBoardUuid(boardUuid);
        msg.setElement(afterDto);
        msg.setAction("UPSERT");

        messagingTemplate.convertAndSend(
                "/topic/boards/" + boardUuid + "/elements",
                msg
        );
        saveHistory(board, element.getId(), BoardHistoryEvent.EventType.ELEMENT_UPDATED, beforeDto, afterDto);

        return afterDto;
    }

    @Override
    @Transactional
    public BoardElementDto updateLocks(UUID boardUuid,
                                       Long elementId,
                                       ElementLockRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        BoardElement element = getElementForBoardOrThrow(board, elementId);
        BoardElementDto beforeDto = elementMapper.toDto(element);
        if (request.getLockedPosition() != null) {
            element.setLockedPosition(request.getLockedPosition());
        }
        if (request.getLockedEditing() != null) {
            element.setLockedEditing(request.getLockedEditing());
        }

        element.setUpdatedAt(Instant.now());

        elementRepository.save(element);

        BoardElementDto afterDto = elementMapper.toDto(element);
        saveHistory(board, element.getId(), BoardHistoryEvent.EventType.ELEMENT_UPDATED, beforeDto, afterDto);

        return afterDto;
    }

    @Override
    @Transactional
    public GroupElementsResponse groupElements(UUID boardUuid,
                                               GroupElementsRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        List<BoardElement> elements = elementRepository.findAllById(request.getElementIds());
        if (elements.size() != request.getElementIds().size()) {
            throw new ValidationException("Some elements not found");
        }
        for (BoardElement el : elements) {
            if (!el.getBoard().getId().equals(board.getId())) {
                throw new ValidationException("Element " + el.getId() + " does not belong to this board");
            }
        }

        ElementGroup group = new ElementGroup();
        group.setBoard(board);
        group.setUuid(UUID.randomUUID());
        group.setName(request.getName() != null ? request.getName() : "Group");
        group.setCreatedAt(Instant.now());

        groupRepository.save(group);

        for (BoardElement el : elements) {
            el.setGroup(group);
            el.setUpdatedAt(Instant.now());
        }
        elementRepository.saveAll(elements);

        List<Long> ids = elements.stream().map(BoardElement::getId).toList();

        saveHistory(board, null, BoardHistoryEvent.EventType.ELEMENT_GROUPED, null, ids);

        GroupElementsResponse response = new GroupElementsResponse();
        response.setGroupId(group.getUuid().toString());
        response.setElementIds(ids);
        return response;
    }

    @Override
    @Transactional
    public void ungroupElements(UUID boardUuid,
                                UngroupElementsRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        UUID groupUuid = UUID.fromString(request.getGroupId());
        ElementGroup group = groupRepository.findByUuidAndBoardUuid(groupUuid, boardUuid)
                .orElseThrow(() -> new ValidationException("Group not found: " + request.getGroupId()));

        List<BoardElement> elements = elementRepository.findAllByGroup(group);
        List<Long> ids = elements.stream().map(BoardElement::getId).toList();

        for (BoardElement el : elements) {
            el.setGroup(null);
            el.setUpdatedAt(Instant.now());
        }
        elementRepository.saveAll(elements);

        groupRepository.delete(group);

        saveHistory(board, null, BoardHistoryEvent.EventType.ELEMENT_UNGROUPED, ids, null);
    }

    @Override
    @Transactional
    public void reorderElements(UUID boardUuid,
                                ReorderElementsRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        Map<Long, Integer> idToZIndex = request.getOrders().stream()
                .collect(Collectors.toMap(ElementOrderDto::getId, ElementOrderDto::getZIndex));

        List<BoardElement> elements = elementRepository.findAllById(idToZIndex.keySet());

        for (BoardElement el : elements) {
            if (!el.getBoard().getId().equals(board.getId())) {
                throw new ValidationException("Element " + el.getId() + " does not belong to this board");
            }
        }

        List<BoardElementDto> before = elements.stream()
                .map(elementMapper::toDto)
                .toList();

        for (BoardElement el : elements) {
            Integer newZ = idToZIndex.get(el.getId());
            if (newZ != null) {
                el.setZIndex(newZ);
                el.setUpdatedAt(Instant.now());
            }
        }
        elementRepository.saveAll(elements);

        List<BoardElementDto> after = elements.stream()
                .map(elementMapper::toDto)
                .toList();

        saveHistory(board, null, BoardHistoryEvent.EventType.ELEMENT_REORDERED, before, after);
    }

    @Override
    @Transactional
    public void deleteElement(UUID boardUuid, Long elementId) {
        try {
            if (!elementRepository.existsById(elementId)) {
                return;
            }

            BoardElement element = elementRepository.findById(elementId)
                    .orElse(null);
            if (element == null) {
                return;
            }

            Board board = element.getBoard();

            User currentUserOrNull = getCurrentUserOrNull();
            if (!boardService.canEdit(board, currentUserOrNull)) {
                throw new SecurityException("Нет прав на редактирование этой доски");
            }

            BoardElementDto beforeDto = elementMapper.toDto(element);

            elementRepository.deleteById(elementId);

            saveHistory(board, elementId, BoardHistoryEvent.EventType.ELEMENT_DELETED, beforeDto, null);

            ElementUpdatedMessage msg = new ElementUpdatedMessage();
            msg.setBoardUuid(boardUuid);
            msg.setElement(beforeDto);
            msg.setAction("DELETE");
            messagingTemplate.convertAndSend(
                    "/topic/boards/" + boardUuid + "/elements",
                    msg
            );

        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException
                 | org.hibernate.StaleObjectStateException ex) {
        }
    }

    @Override
    @Transactional
    public CopyElementsResponse copyElements(UUID boardUuid,
                                             CopyElementsRequest request) {
        Board board = getBoardOrThrow(boardUuid);

        User currentUserOrNull = getCurrentUserOrNull();
        if (!boardService.canEdit(board, currentUserOrNull)) {
            throw new SecurityException("Нет прав на редактирование этой доски");
        }

        List<BoardElement> originals = elementRepository.findAllById(request.getElementIds());
        if (originals.size() != request.getElementIds().size()) {
            throw new ValidationException("Some elements not found");
        }

        List<BoardElement> copies = new ArrayList<>();
        List<CopyElementsResponse.ElementCopyInfo> copyInfos = new ArrayList<>();

        for (BoardElement original : originals) {
            if (!original.getBoard().getId().equals(board.getId())) {
                throw new ValidationException("Element " + original.getId() + " does not belong to this board");
            }

            BoardElement copy = new BoardElement();
            copy.setBoard(board);
            copy.setType(original.getType());
            copy.setX(original.getX() + request.getOffsetX());
            copy.setY(original.getY() + request.getOffsetY());
            copy.setWidth(original.getWidth());
            copy.setHeight(original.getHeight());
            copy.setRotation(original.getRotation());
            copy.setZIndex(original.getZIndex() + 1);

            copy.setGroup(original.getGroup());
            copy.setLockedPosition(false);
            copy.setLockedEditing(false);
            copy.setMedia(original.getMedia());
            copy.setPropertiesJson(original.getPropertiesJson());
            copy.setCreatedAt(Instant.now());
            copy.setUpdatedAt(Instant.now());

            copies.add(copy);
        }

        elementRepository.saveAll(copies);

        for (int i = 0; i < originals.size(); i++) {
            BoardElement orig = originals.get(i);
            BoardElement cpy = copies.get(i);

            CopyElementsResponse.ElementCopyInfo info =
                    new CopyElementsResponse.ElementCopyInfo(orig.getId(), cpy.getId());
            copyInfos.add(info);
        }

        saveHistory(board, null, BoardHistoryEvent.EventType.ELEMENT_COPIED,
                request.getElementIds(), copyInfos);

        CopyElementsResponse response = new CopyElementsResponse();
        response.setCopies(copyInfos);
        return response;
    }
}
