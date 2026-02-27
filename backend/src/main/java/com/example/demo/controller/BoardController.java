package com.example.demo.controller;

import com.example.demo.dto.BoardDto;
import com.example.demo.dto.CreateBoardRequest;
import com.example.demo.dto.UpdateBoardRequest;
import com.example.demo.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public List<BoardDto> getMyBoards() {
        return boardService.getBoardsForCurrentUser();
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

    @PostMapping("/temporary")
    public BoardDto createTemporaryBoard(@RequestParam(required = false) String title) {
        return boardService.createTemporaryBoard(title);
    }

    @GetMapping("/{boardUuid}")
    public BoardDto getTemporaryBoard(@PathVariable UUID boardUuid) {
        // просто проксируем к BoardService.getBoard
        return boardService.getBoard(boardUuid);
    }
}
