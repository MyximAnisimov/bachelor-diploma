package com.example.demo.service;

import com.example.demo.dto.BoardDto;
import com.example.demo.dto.CreateBoardRequest;
import com.example.demo.dto.UpdateBoardRequest;
import com.example.demo.model.Board;
import com.example.demo.model.BoardAccessMode;
import com.example.demo.model.User;

import java.util.List;
import java.util.UUID;

public interface BoardService {
//    List<BoardDto> getBoardsForCurrentUser();
    BoardDto createBoard(CreateBoardRequest request);
    BoardDto getBoard(UUID boardUuid);
    BoardDto updateBoard(UUID boardUuid, UpdateBoardRequest request);
    void deleteBoard(UUID boardUuid);
    BoardDto createTemporaryBoard(String title);
    BoardDto updateAccessMode(UUID boardUuid, BoardAccessMode mode);
    boolean canEdit(Board board, User currentUserOrNull);
    List<BoardDto> listBoardsForCurrentUser(String sortBy, String order);
}
