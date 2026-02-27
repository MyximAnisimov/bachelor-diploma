package com.example.demo.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ElementOrderDto {

    @NotNull
    private Long id;

    @NotNull
    private Integer zIndex;
}