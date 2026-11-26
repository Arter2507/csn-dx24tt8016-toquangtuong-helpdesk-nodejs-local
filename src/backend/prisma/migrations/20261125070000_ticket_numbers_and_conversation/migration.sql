ALTER TABLE tickets ADD COLUMN display_code VARCHAR(40) NULL;
UPDATE tickets
SET display_code = CONCAT('HD-', LPAD(id, GREATEST(3, CHAR_LENGTH(id)), '0'));
ALTER TABLE tickets MODIFY display_code VARCHAR(40) NOT NULL,
  ADD UNIQUE INDEX uq_tickets_display_code (display_code);

CREATE TABLE ticket_number_rules (
  category_id BIGINT UNSIGNED NOT NULL,
  prefix VARCHAR(12) NOT NULL DEFAULT '',
  next_number INT UNSIGNED NOT NULL DEFAULT 1,
  digits TINYINT UNSIGNED NOT NULL DEFAULT 4,
  suffix VARCHAR(12) NOT NULL DEFAULT '',
  PRIMARY KEY (category_id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Category 0 holds the shared sequence for categories without a custom rule.
INSERT INTO ticket_number_rules (category_id) VALUES (0);

ALTER TABLE ticket_comments ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;
