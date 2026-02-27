package com.example.demo.dto;

import lombok.Data;

@Data
public class ElementLockRequest {

    private Boolean lockedPosition;
    private Boolean lockedEditing;
}
