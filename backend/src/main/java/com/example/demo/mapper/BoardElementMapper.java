package com.example.demo.mapper;

import com.example.demo.dto.BoardElementDto;
import com.example.demo.model.BoardElement;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BoardElementMapper {

    private final ObjectMapper objectMapper;

    public BoardElementDto toDto(BoardElement entity) {
        BoardElementDto dto = new BoardElementDto();
        dto.setId(entity.getId());
        dto.setType(entity.getType());
        dto.setX(entity.getX());
        dto.setY(entity.getY());
        dto.setWidth(entity.getWidth());
        dto.setHeight(entity.getHeight());
        dto.setRotation(entity.getRotation());
        dto.setZIndex(entity.getZIndex());
        dto.setLockedPosition(entity.isLockedPosition());
        dto.setLockedEditing(entity.isLockedEditing());

        dto.setMediaId(entity.getMedia() != null ? entity.getMedia().getId() : null);
        dto.setGroupId(entity.getGroup() != null ? entity.getGroup().getUuid().toString() : null);

        try {
            String json = entity.getPropertiesJson();
            JsonNode node = (json != null && !json.isEmpty())
                    ? objectMapper.readTree(json)
                    : objectMapper.createObjectNode();
            dto.setProperties(node);
        } catch (Exception e) {
            dto.setProperties(objectMapper.createObjectNode());
        }

        return dto;
    }
}
