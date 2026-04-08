package com.example.demo.controller;

import com.example.demo.dto.UploadedFileDto;
import com.example.demo.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class UploadController {

    private final FileStorageService fileStorageService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadedFileDto uploadFile(@RequestParam("file") MultipartFile file) throws Exception {
        return fileStorageService.saveFile(file);
    }
}
