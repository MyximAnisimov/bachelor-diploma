package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
public class CopyElementsResponse {

    private List<ElementCopyInfo> copies;

    @Data
    @AllArgsConstructor
    public static class ElementCopyInfo {
        private Long sourceId;
        private Long newId;
    }
}