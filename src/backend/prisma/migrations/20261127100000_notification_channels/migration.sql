CREATE TABLE ticket_status_mail (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NOT NULL,
  ticket_code VARCHAR(40) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket_status VARCHAR(20) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  sent_at DATETIME(3) NULL,
  failed_at DATETIME(3) NULL,
  KEY idx_ticket_status_mail_ready (sent_at, failed_at, available_at, id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE inbound_ticket_mail (
  fingerprint CHAR(64) NOT NULL PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE tickets
  ADD COLUMN response_warning_due_at DATETIME(3) NULL,
  ADD COLUMN resolution_warning_due_at DATETIME(3) NULL,
  ADD KEY idx_tickets_response_due (response_due_at),
  ADD KEY idx_tickets_resolution_due (resolution_due_at);
