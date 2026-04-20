package com.example.demo.controller;

import com.example.demo.dto.BoardDto;
import com.example.demo.dto.CreateBoardRequest;
import com.example.demo.dto.UpdateBoardRequest;
import com.example.demo.model.BoardAccessMode;
import com.example.demo.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping("/my")
    public List<BoardDto> myBoards(
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String order
    ) {
        return boardService.listBoardsForCurrentUser(sortBy, order);
    }

    @PostMapping("/temporary")
    public BoardDto createTemporaryBoard(@RequestParam(required = false) String title) {
        return boardService.createTemporaryBoard(title);
    }

    @GetMapping("/public/{boardUuid}")
    public BoardDto getTemporaryBoard(@PathVariable UUID boardUuid) {
        return boardService.getBoard(boardUuid);
    }

    @PostMapping
    public BoardDto createBoard(@Valid @RequestBody CreateBoardRequest request) {
        return boardService.createBoard(request);
    }

    @GetMapping("/{boardUuid}")
    public BoardDto getBoard(@PathVariable UUID boardUuid) {
        return boardService.getBoard(boardUuid);
    }

    @PutMapping("/{boardUuid}")
    public BoardDto updateBoard(@PathVariable UUID boardUuid,
                                @Valid @RequestBody UpdateBoardRequest request) {
        return boardService.updateBoard(boardUuid, request);
    }

    @DeleteMapping("/{boardUuid}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBoard(@PathVariable UUID boardUuid) {
        boardService.deleteBoard(boardUuid);
    }

    @PatchMapping("/{uuid}/access")
    public BoardDto updateAccess(
            @PathVariable UUID uuid,
            @RequestBody UpdateAccessRequest request
    ) {
        BoardAccessMode mode = BoardAccessMode.valueOf(request.getAccessMode());
        return boardService.updateAccessMode(uuid, mode);
    }

    public static class UpdateAccessRequest {
        private String accessMode;

        public String getAccessMode() {
            return accessMode;
        }

        public void setAccessMode(String accessMode) {
            this.accessMode = accessMode;
        }
    }
}