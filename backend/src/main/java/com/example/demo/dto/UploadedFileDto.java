package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadedFileDto {
    private Long id;
    private String url;
    private Integer width;
    private Integer height;
    private String contentType;
}
