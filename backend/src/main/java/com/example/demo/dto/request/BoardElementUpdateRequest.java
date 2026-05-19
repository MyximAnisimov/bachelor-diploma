package com.example.demo.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class BoardElementUpdateRequest {

    private Double x;
    private Double y;
    private Double width;
    private Double height;
    private Double rotation;

    private Integer zIndex;

    private String groupId;

    private Boolean lockedPosition;
    private Boolean lockedEditing;

    private Long mediaId;

    private JsonNode properties;
}
