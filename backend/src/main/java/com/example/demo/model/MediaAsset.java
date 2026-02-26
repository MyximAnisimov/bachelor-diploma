package com.example.demo.model;

import com.example.demo.model.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "media_assets")
public class MediaAsset {

    public enum MediaType {
        IMAGE, VIDEO, AUDIO, PDF, OTHER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id")
    private User uploader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id")
    private Board board;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaType mediaType;

    @Column(nullable = false)
    private String url;

    private String originalFilename;

    private String mimeType;

    private Long sizeBytes;

    private Integer width;
    private Integer height;

    private Double durationSeconds;

    @Column(nullable = false, updatable = false)
    private Instant uploadedAt = Instant.now();

}
