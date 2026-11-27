CREATE TABLE organization_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organization_id TINYINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_org_units_code (organization_id, code),
  UNIQUE KEY uq_org_units_id (organization_id, id),
  KEY idx_org_units_parent (organization_id, parent_id),
  CONSTRAINT fk_org_units_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_org_units_parent FOREIGN KEY (organization_id, parent_id) REFERENCES organization_units(organization_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE organization_members ADD COLUMN unit_id BIGINT UNSIGNED NULL,
  ADD KEY idx_members_unit (organization_id, unit_id),
  ADD CONSTRAINT fk_members_unit FOREIGN KEY (organization_id, unit_id)
    REFERENCES organization_units(organization_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT;

INSERT INTO organization_units (organization_id, code, name)
SELECT organization_id, CONCAT('DV-', MIN(user_id)), MIN(TRIM(department))
FROM organization_members WHERE TRIM(department) <> ''
GROUP BY organization_id, TRIM(department);

UPDATE organization_members m JOIN organization_units unit
  ON unit.organization_id = m.organization_id AND unit.name = TRIM(m.department)
SET m.unit_id = unit.id;
