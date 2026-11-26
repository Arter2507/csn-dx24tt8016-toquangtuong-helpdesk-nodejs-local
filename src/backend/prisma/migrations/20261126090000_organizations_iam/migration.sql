ALTER TABLE users
  MODIFY password_hash VARCHAR(255) NULL,
  ADD COLUMN activation_token_hash CHAR(64) NULL,
  ADD COLUMN activation_expires_at DATETIME(3) NULL,
  ADD UNIQUE INDEX uq_users_activation_token_hash (activation_token_hash);

CREATE TABLE organizations (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  owner_id BIGINT UNSIGNED NULL UNIQUE,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_organizations_single_workspace CHECK (id = 1),
  CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO organizations (id, name, code, owner_id, created_at)
VALUES (1, 'Trạm Mèo', 'TRAM-MEO',
  (SELECT MIN(u.id) FROM users u JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id WHERE u.is_active = 1 AND r.code = 'ADMIN'),
  UTC_TIMESTAMP(3));

CREATE TABLE organization_members (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  organization_id TINYINT UNSIGNED NOT NULL,
  employee_code VARCHAR(40) NULL,
  department VARCHAR(100) NOT NULL DEFAULT '',
  position VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('OWNER', 'ADMIN', 'TECHNICIAN', 'USER') NOT NULL,
  joined_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_members_employee_code (organization_id, employee_code),
  KEY idx_members_org_role (organization_id, role),
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_members_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO organization_members (user_id, organization_id, department, position, role, joined_at)
SELECT u.id, o.id,
  LEFT(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.department')), 'null'), ''), 100),
  LEFT(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p.details, '$.jobTitle')), 'null'), ''), 100),
  CASE
    WHEN o.owner_id = u.id THEN 'OWNER'
    WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.code = 'ADMIN') THEN 'ADMIN'
    WHEN EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.code = 'TECHNICIAN') THEN 'TECHNICIAN'
    ELSE 'USER'
  END,
  u.created_at
FROM users u CROSS JOIN organizations o LEFT JOIN user_profiles p ON p.user_id = u.id;
