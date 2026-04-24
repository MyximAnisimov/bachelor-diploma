CREATE TABLE board_versions (
    id                 BIGSERIAL PRIMARY KEY,
    board_id           BIGINT      NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    board_uuid         UUID        NOT NULL,
    created_at         TIMESTAMP   NOT NULL DEFAULT now(),
    created_by_id      BIGINT      NOT NULL REFERENCES users(id),
    label              VARCHAR(255),
    payload_json       TEXT        NOT NULL
);

CREATE INDEX idx_board_versions_board_id_created_at
    ON board_versions(board_id, created_at DESC);