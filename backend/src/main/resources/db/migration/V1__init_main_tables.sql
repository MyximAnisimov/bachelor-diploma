-- USERS
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    external_id     VARCHAR(255) NOT NULL UNIQUE,
    provider        VARCHAR(32)  NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    avatar_url      VARCHAR(1000),
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

-- BOARDS
CREATE TABLE boards (
    id          BIGSERIAL PRIMARY KEY,
    uuid        UUID         NOT NULL UNIQUE,
    title       VARCHAR(255) NOT NULL,
    owner_id    BIGINT REFERENCES users(id),
    temporary   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    expires_at  TIMESTAMP
);

-- ELEMENT GROUPS
CREATE TABLE element_groups (
    id          BIGSERIAL PRIMARY KEY,
    uuid        UUID         NOT NULL UNIQUE,
    board_id    BIGINT       NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

-- MEDIA ASSETS
CREATE TABLE media_assets (
    id                BIGSERIAL PRIMARY KEY,
    uploader_id       BIGINT REFERENCES users(id),
    board_id          BIGINT REFERENCES boards(id) ON DELETE SET NULL,
    media_type        VARCHAR(32)  NOT NULL,
    url               VARCHAR(1000) NOT NULL,
    original_filename VARCHAR(255),
    mime_type         VARCHAR(255),
    size_bytes        BIGINT,
    width             INT,
    height            INT,
    duration_seconds  DOUBLE PRECISION,
    uploaded_at       TIMESTAMP    NOT NULL DEFAULT now()
);

-- BOARD ELEMENTS
CREATE TABLE board_elements (
    id               BIGSERIAL PRIMARY KEY,
    board_id         BIGINT      NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    type             VARCHAR(32) NOT NULL,

    x                DOUBLE PRECISION NOT NULL,
    y                DOUBLE PRECISION NOT NULL,
    width            DOUBLE PRECISION NOT NULL,
    height           DOUBLE PRECISION NOT NULL,
    rotation         DOUBLE PRECISION NOT NULL DEFAULT 0,

    z_index          INT NOT NULL DEFAULT 0,

    group_id         BIGINT REFERENCES element_groups(id) ON DELETE SET NULL,

    locked_position  BOOLEAN NOT NULL DEFAULT FALSE,
    locked_editing   BOOLEAN NOT NULL DEFAULT FALSE,

    media_id         BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,

    properties_json  TEXT   NOT NULL DEFAULT '{}',

    created_by_id    BIGINT REFERENCES users(id),
    updated_by_id    BIGINT REFERENCES users(id),

    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- История событий
CREATE TABLE board_history_events (
    id                 BIGSERIAL PRIMARY KEY,
    board_id           BIGINT      NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    actor_id           BIGINT REFERENCES users(id),
    element_id         BIGINT,
    event_type         VARCHAR(64) NOT NULL,
    before_state_json  TEXT,
    after_state_json   TEXT,
    created_at         TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_boards_owner_id ON boards(owner_id);

CREATE INDEX idx_board_elements_board_id ON board_elements(board_id);
CREATE INDEX idx_board_elements_board_zindex ON board_elements(board_id, z_index);
CREATE INDEX idx_board_elements_group_id ON board_elements(group_id);

CREATE INDEX idx_element_groups_board_id ON element_groups(board_id);

CREATE INDEX idx_history_board_id_created_at
    ON board_history_events(board_id, created_at);