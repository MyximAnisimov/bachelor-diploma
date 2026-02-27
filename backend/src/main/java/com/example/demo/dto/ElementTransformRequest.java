package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ElementTransformRequest {

    @NotNull
    private Double x;

    @NotNull
    private Double y;

    @NotNull
    private Double width;

    @NotNull
    private Double height;

    @NotNull
    private Double rotation;
}
