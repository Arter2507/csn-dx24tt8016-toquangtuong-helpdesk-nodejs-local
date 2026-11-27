ALTER TABLE organization_units ADD COLUMN deleted_at DATETIME(3) NULL;

ALTER TABLE categories ADD COLUMN parent_id BIGINT UNSIGNED NULL,
  ADD KEY idx_categories_parent (parent_id),
  ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE SET NULL ON UPDATE RESTRICT;

CREATE TABLE sla_settings (
  organization_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  policy JSON NOT NULL,
  CONSTRAINT fk_sla_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE organization_members ADD COLUMN customer_tier ENUM('STANDARD', 'VIP') NOT NULL DEFAULT 'STANDARD';
ALTER TABLE tickets
  ADD COLUMN response_due_at DATETIME(3) NULL,
  ADD COLUMN resolution_due_at DATETIME(3) NULL,
  ADD COLUMN first_response_at DATETIME(3) NULL;
