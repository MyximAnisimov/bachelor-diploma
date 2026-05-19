package com.example.demo.dto.request;

import com.example.demo.dto.ElementOrderDto;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReorderElementsRequest {

    @NotEmpty
    private List<ElementOrderDto> orders;
}
