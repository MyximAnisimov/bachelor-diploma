package com.example.demo.dto.request;

import lombok.Data;

@Data
public class ElementLockRequest {

    private Boolean lockedPosition;
    private Boolean lockedEditing;
}
