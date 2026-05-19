package com.example.demo.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class GroupElementsRequest {

    @NotEmpty
    private List<Long> elementIds;

    private String name;
}
