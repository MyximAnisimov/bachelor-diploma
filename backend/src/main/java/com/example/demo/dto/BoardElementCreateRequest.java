package com.example.demo.dto;

import com.example.demo.model.BoardElement.ElementType;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BoardElementCreateRequest {

    @NotNull
    private ElementType type;

    @NotNull
    private Double x;

    @NotNull
    private Double y;

    @NotNull
    private Double width;

    @NotNull
    private Double height;

    private Double rotation;

    private Integer zIndex;

    private String groupId;

    private Long mediaId;

    private JsonNode properties;
}
