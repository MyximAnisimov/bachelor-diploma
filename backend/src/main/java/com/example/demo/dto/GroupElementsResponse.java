package com.example.demo.dto;

import lombok.Data;

import java.util.List;

@Data
public class GroupElementsResponse {

    private String groupId;
    private List<Long> elementIds;
}