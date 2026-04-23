ALTER TABLE users
    ALTER COLUMN external_id DROP NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT users_email_unique UNIQUE (email);