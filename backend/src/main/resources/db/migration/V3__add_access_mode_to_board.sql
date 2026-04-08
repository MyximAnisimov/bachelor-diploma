ALTER TABLE boards
    ADD COLUMN access_mode varchar(32) NOT NULL DEFAULT 'PRIVATE';