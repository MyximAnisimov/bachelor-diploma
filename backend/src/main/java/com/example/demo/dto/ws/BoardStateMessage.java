package com.example.demo.dto.ws;

import lombok.Data;

@Data
public class BoardStateMessage {
    private String type;
    private Object payload;
}
