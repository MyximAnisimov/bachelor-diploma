package com.example.demo.mapper;

import com.example.demo.dto.BoardDto;
import com.example.demo.model.Board;


public class BoardMapper {
    public BoardDto toDto(Board entity) {
        BoardDto dto = new BoardDto();
        dto.setUuid(entity.getUuid());
        dto.setTitle(entity.getTitle());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
