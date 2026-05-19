package com.example.demo.service;

import com.example.demo.dto.BoardDto;
import com.example.demo.dto.request.CreateBoardRequest;
import com.example.demo.dto.request.UpdateBoardRequest;
import com.example.demo.model.Board;
import com.example.demo.model.BoardAccessMode;
import com.example.demo.model.User;
import com.example.demo.repository.BoardRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new IllegalStateException("Пользователь не аутентифицирован");
        }
        Object principal = auth.getPrincipal();
        String email;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            email = ud.getUsername();
        } else if (principal instanceof User u) {
            email = u.getEmail();
        } else {
            throw new IllegalStateException("Неизвестный тип principal: " + principal.getClass());
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalStateException("Пользователь не найден: " + email));
    }

    private User getCurrentUserOrNull() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null
                || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }

        Object principal = auth.getPrincipal();
        String email;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
            email = ud.getUsername();
        } else if (principal instanceof User u) {
            email = u.getEmail();
        } else {
            return null;
        }

        return userRepository.findByEmail(email).orElse(null);
    }

    private BoardDto toDto(Board board) {
        Long ownerId = board.getOwner() != null ? board.getOwner().getId() : null;
        return new BoardDto(
                board.getUuid(),
                board.getTitle(),
                board.isTemporary(),
                board.getCreatedAt(),
                board.getUpdatedAt(),
                board.getAccessMode(),
                ownerId
        );
    }

    private Board getBoardForView(UUID boardUuid, User currentUserOrNull) {
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        if (!canView(board, currentUserOrNull)) {
            throw new SecurityException("Нет доступа к этой доске");
        }

        return board;
    }

    public boolean canView(Board board, User currentUserOrNull) {
        if (currentUserOrNull != null
                && board.getOwner() != null
                && board.getOwner().getId().equals(currentUserOrNull.getId())) {
            return true;
        }
        if (board.isTemporary() && board.getOwner() == null) {
            return true;
        }
        return switch (board.getAccessMode()) {
            case PRIVATE -> false;
            case LINK_VIEW, LINK_EDIT -> true;
        };
    }

    public boolean canEdit(Board board, User currentUserOrNull) {
        if (currentUserOrNull != null
                && board.getOwner() != null
                && board.getOwner().getId().equals(currentUserOrNull.getId())) {
            return true;
        }
        return board.getAccessMode() == BoardAccessMode.LINK_EDIT;
    }

    public BoardDto updateAccessMode(UUID boardUuid, BoardAccessMode mode) {
        User currentUser = getCurrentUser();

        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));

        if (board.getOwner() == null || !board.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Только владелец может изменять права доступа");
        }

        board.setAccessMode(mode);
        Board saved = boardRepository.save(board);
        return toDto(saved);
    }

    @Override
    public BoardDto createBoard(CreateBoardRequest request) {
        User currentUser = getCurrentUserOrNull();

        Board board = new Board();
        board.setUuid(UUID.randomUUID());
        board.setTitle(request.getTitle() != null && !request.getTitle().isBlank()
                ? request.getTitle()
                : (currentUser != null ? "Новая доска" : "Временная доска"));

        if (currentUser != null) {
            board.setOwner(currentUser);
            board.setTemporary(false);
            board.setAccessMode(BoardAccessMode.PRIVATE);
        } else {
            board.setOwner(null);
            board.setTemporary(true);
            board.setAccessMode(BoardAccessMode.LINK_EDIT);
        }

        Board saved = boardRepository.save(board);
        return toDto(saved);
    }

    @Override
    public BoardDto getBoard(UUID boardUuid) {
        User currentUserOrNull = getCurrentUserOrNull();
        Board board = getBoardForView(boardUuid, currentUserOrNull);
        return toDto(board);
    }

    @Override
    public BoardDto updateBoard(UUID boardUuid, UpdateBoardRequest request) {
        User currentUser = getCurrentUser();
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));
        if (board.getOwner() == null || !board.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Нет прав на изменение этой доски");
        }
        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            board.setTitle(request.getTitle());
        }
        Board saved = boardRepository.save(board);
        return toDto(saved);
    }

    @Override
    public void deleteBoard(UUID boardUuid) {
        User currentUser = getCurrentUser();
        Board board = boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new IllegalArgumentException("Доска не найдена"));
        if (board.getOwner() == null || !board.getOwner().getId().equals(currentUser.getId())) {
            throw new SecurityException("Нет прав на удаление этой доски");
        }
        boardRepository.delete(board);
    }

    @Override
    public BoardDto createTemporaryBoard(String title) {
        Board board = new Board();
        board.setUuid(UUID.randomUUID());
        board.setTitle(title != null && !title.isBlank() ? title : "Временная доска");
        board.setOwner(null);
        board.setTemporary(true);
        board.setAccessMode(BoardAccessMode.LINK_EDIT);
        Board saved = boardRepository.save(board);
        return toDto(saved);
    }

    @Override
    public List<BoardDto> listBoardsForCurrentUser(String sortBy, String order) {
        User currentUser = getCurrentUser();
        Sort sort;
        if ("title".equalsIgnoreCase(sortBy)) {
            sort = Sort.by("title");
        } else {
            sort = Sort.by("createdAt");
        }
        if ("desc".equalsIgnoreCase(order)) {
            sort = sort.descending();
        } else {
            sort = sort.ascending();
        }

        List<Board> boards = boardRepository.findAllByOwnerId(currentUser.getId(), sort);
        return boards.stream().map(this::toDto).toList();
    }
}