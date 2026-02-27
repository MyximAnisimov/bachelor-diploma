package com.example.demo.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Data
public class CopyElementsRequest {

    @NotEmpty
    private List<Long> elementIds;

    @NotNull
    private Double offsetX;

    @NotNull
    private Double offsetY;
}
