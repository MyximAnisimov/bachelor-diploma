package com.example.demo.model;

import com.example.demo.model.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "board_history_events")
public class BoardHistoryEvent {

    public enum EventType {
        ELEMENT_CREATED,
        ELEMENT_UPDATED,
        ELEMENT_DELETED,
        ELEMENT_GROUPED,
        ELEMENT_UNGROUPED,
        BOARD_RENAMED,
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "element_id")
    private Long elementId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType;

    @Lob
    @Column(name = "before_state_json")
    private String beforeStateJson;

    @Lob
    @Column(name = "after_state_json")
    private String afterStateJson;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

}
