package com.example.demo.dto;

import com.example.demo.model.BoardElement.ElementType;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class BoardElementDto {

    private Long id;

    private ElementType type;

    private double x;
    private double y;
    private double width;
    private double height;
    private double rotation;

    private int zIndex;

    private String groupId;

    private boolean lockedPosition;
    private boolean lockedEditing;

    private Long mediaId;

    private JsonNode properties;
}
