package com.example.demo.service;

import com.example.demo.dto.UploadedFileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Value("${app.upload.public-base-url:/uploads}")
    private String publicBaseUrl;

    public UploadedFileDto saveFile(MultipartFile multipartFile) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = multipartFile.getOriginalFilename();
        String ext = "";

        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        String filename = UUID.randomUUID().toString() + ext;
        Path targetPath = uploadPath.resolve(filename);

        Files.copy(multipartFile.getInputStream(), targetPath);

        Integer width = null;
        Integer height = null;

        String contentType = multipartFile.getContentType();
        if (contentType != null && contentType.startsWith("image/")) {
            try {
                BufferedImage image = ImageIO.read(targetPath.toFile());
                if (image != null) {
                    width = image.getWidth();
                    height = image.getHeight();
                }
            } catch (Exception ignored) {
            }
        }

        String url = publicBaseUrl + "/" + filename;

        return new UploadedFileDto(
                null,
                url,
                width,
                height,
                contentType
        );
    }
}