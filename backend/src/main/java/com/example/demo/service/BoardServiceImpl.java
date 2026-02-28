package com.example.demo.service;

import com.example.demo.dto.BoardDto;
import com.example.demo.dto.CreateBoardRequest;
import com.example.demo.dto.UpdateBoardRequest;
import com.example.demo.model.Board;
import com.example.demo.repository.BoardRepository;
import com.example.demo.service.BoardService;
import com.example.demo.exception.NotFoundException;
import com.example.demo.exception.ValidationException;
import com.example.demo.security.AuthUser;
import com.example.demo.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardServiceImpl implements BoardService {

    private final BoardRepository boardRepository;
//    private final AuthUser authUser;


//    private User getCurrentUserOrThrow() {
//        return authUser.getCurrentUser()
//                .orElseThrow(() -> new ValidationException("Authentication required"));
//    }

    private Board getBoardOrThrow(UUID boardUuid) {
        return boardRepository.findByUuid(boardUuid)
                .orElseThrow(() -> new NotFoundException("Board not found: " + boardUuid));
    }

//    /**
//     * Проверка прав доступа:
//     *  - если доска имеет owner -> только он может читать/изменять;
//     *  - если owner == null (например, гостевая доска) – сейчас допускаем всех.
//     * Можно усложнить в будущем.
//     */
private void checkAccessToBoard(Board board, boolean requireOwner) {
    if (board.isTemporary() && board.getOwner() == null) {
        if (board.getExpiresAt() != null &&
                board.getExpiresAt().isBefore(Instant.now())) {
            throw new NotFoundException("Board expired");
        }
        return;
    }

//    User current = authUser.getCurrentUser()
//            .orElseThrow(() -> new ValidationException("Authentication required"));
//
//    if (!board.getOwner().getId().equals(current.getId())) {
//        throw new ValidationException("Access denied");
//    }

}

    private BoardDto toDto(Board board) {
        BoardDto dto = new BoardDto();
        dto.setUuid(board.getUuid());
        dto.setTitle(board.getTitle());
        dto.setTemporary(board.isTemporary());
        dto.setCreatedAt(board.getCreatedAt());
        dto.setUpdatedAt(board.getUpdatedAt());
        return dto;
    }

//    @Override
//    public List<BoardDto> getBoardsForCurrentUser() {
//        User user = getCurrentUserOrThrow();
//        List<Board> boards = boardRepository.findAllByOwnerOrderByCreatedAtDesc(user);
//        return boards.stream()
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }

//    @Override
//    public BoardDto createBoard(CreateBoardRequest request) {
//        User user = getCurrentUserOrThrow();
//
//        if (request.getTitle() == null || request.getTitle().isBlank()) {
//            throw new ValidationException("Title must not be blank");
//        }
//
//        Board board = new Board();
//        board.setUuid(UUID.randomUUID());
//        board.setTitle(request.getTitle().trim());
//        board.setOwner(user);
//        board.setTemporary(Boolean.TRUE.equals(request.getTemporary()));
//
//        board.setCreatedAt(Instant.now());
//        board.setUpdatedAt(Instant.now());
//
//        Board saved = boardRepository.save(board);
//        return toDto(saved);
//    }

    @Override
    public BoardDto getBoard(UUID boardUuid) {
        Board board = getBoardOrThrow(boardUuid);
        checkAccessToBoard(board, false);
        return toDto(board);
    }

//    @Override
//    public BoardDto updateBoard(UUID boardUuid, UpdateBoardRequest request) {
//        Board board = getBoardOrThrow(boardUuid);
//        checkAccessToBoard(board, true);
//
//        boolean changed = false;
//
//        if (request.getTitle() != null) {
//            String title = request.getTitle().trim();
//            if (title.isEmpty()) {
//                throw new ValidationException("Title must not be blank");
//            }
//            board.setTitle(title);
//            changed = true;
//        }
//
//        if (request.getTemporary() != null) {
//            board.setTemporary(request.getTemporary());
//            changed = true;
//        }
//
//        if (changed) {
//            board.setUpdatedAt(Instant.now());
//
//            boardRepository.save(board);
//        }
//
//        return toDto(board);
//    }

//    @Override
//    public void deleteBoard(UUID boardUuid) {
//        Board board = getBoardOrThrow(boardUuid);
//        checkAccessToBoard(board, true);
//
//        boardRepository.delete(board);
//    }

    @Override
    @Transactional
    public BoardDto createTemporaryBoard(String title) {
        String actualTitle = (title == null || title.isBlank())
                ? "Untitled board"
                : title.trim();

        Board board = new Board();
        board.setUuid(UUID.randomUUID());
        board.setTitle(actualTitle);
        board.setOwner(null);
        board.setTemporary(true);
        board.setCreatedAt(Instant.now());
        board.setUpdatedAt(Instant.now());

        board.setExpiresAt(Instant.now().plusSeconds(60L * 60 * 24 * 7)); // 7 дней

        return toDto(boardRepository.save(board));
    }
}
