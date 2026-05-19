package com.example.demo.dto.request;

import lombok.Data;

@Data
public class UpdateBoardRequest {
    private String title;
    private Boolean temporary;
}