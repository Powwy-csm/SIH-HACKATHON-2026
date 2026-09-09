ALTER TABLE students ADD COLUMN content_version BIGINT NOT NULL DEFAULT 0;
CREATE INDEX idx_students_content_version ON students (content_version);
