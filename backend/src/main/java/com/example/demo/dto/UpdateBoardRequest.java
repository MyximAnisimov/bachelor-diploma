package com.example.demo.dto;

import lombok.Data;

@Data
public class UpdateBoardRequest {
    private String title;
    private Boolean temporary;
}