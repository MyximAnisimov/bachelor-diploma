package com.example.demo.model;

import com.example.demo.model.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "board_elements")
public class BoardElement {

    public enum ElementType {
        SHAPE,      // геометрические фигуры
        TEXT,       // текстовые блоки
        STICKY,     // стикеры
        ARROW,      // стрелки/коннекторы
        BRUSH,      // мазки кисти/freehand
        MEDIA       // картинки, видео, pdf и т.п.
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ElementType type;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    @Column(nullable = false)
    private double rotation = 0.0;

    @Column(nullable = false)
    private int zIndex = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private ElementGroup group;

    @Column(nullable = false)
    private boolean lockedPosition = false;

    @Column(nullable = false)
    private boolean lockedEditing = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_id")
    private MediaAsset media;

    /**
     * JSON-строка с типозависимыми свойствами.
     * Примеры структур:
     *  - TEXT:   { "text": "...", "fontSize": 16, "color": "#000", ... }
     *  - SHAPE:  { "shapeType": "RECT", "fill": "#fff", "stroke": "#000", ... }
     *  - ARROW:  { "points": [x1, y1, x2, y2,...], "stroke": "#f00", ... }
     *  - BRUSH:  { "points": [...], "stroke": "#000", "strokeWidth": 3 }
     *  - STICKY: { "text": "...", "backgroundColor": "#ff0", ... }
     */
    @Lob
    @Column(name = "properties_json", nullable = false)
    private String propertiesJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

}