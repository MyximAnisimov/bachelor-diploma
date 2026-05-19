package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UngroupElementsRequest {

    @NotBlank
    private String groupId;
}