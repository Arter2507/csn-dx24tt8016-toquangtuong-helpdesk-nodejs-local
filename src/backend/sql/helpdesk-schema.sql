-- Trạm Mèo / Helpdesk — schema MySQL đầy đủ (InnoDB, utf8mb4)
-- Dùng để import bằng DBeaver hoặc Navicat cho đồ án 2 người.
-- Nguồn thiết kế: documents/markdown/database-demo.md
--
-- Cách dùng (DBeaver / Navicat / mysql CLI):
--   1. Kết nối MySQL 8.x với quyền CREATE DATABASE
--   2. Chạy toàn bộ file này (Execute SQL Script / Run)
--   3. Sao chép .env.example thành .env và điền mật khẩu khớp tài khoản MySQL
--
-- Mật khẩu tài khoản seed: password
-- (bcrypt hash bên dưới chỉ dùng cho môi trường demo/local)

-- Đổi tên database cho khớp .env nếu cần (mặc định đồ án: tram_meo_helpdesk_db)
CREATE DATABASE IF NOT EXISTS tram_meo_helpdesk_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tram_meo_helpdesk_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS ticket_status_mail;
DROP TABLE IF EXISTS inbound_ticket_mail;
DROP TABLE IF EXISTS ticket_events;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS ticket_number_rules;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS technician_categories;
DROP TABLE IF EXISTS knowledge_articles;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organization_units;
DROP TABLE IF EXISTS sla_settings;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  username VARCHAR(32) NULL,
  password_hash VARCHAR(255) NULL,
  activation_token_hash CHAR(64) NULL,
  activation_expires_at DATETIME(3) NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_activation_token_hash (activation_token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organizations (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(1000) NOT NULL DEFAULT '',
  owner_id BIGINT UNSIGNED NULL UNIQUE,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT chk_organizations_single_workspace CHECK (id = 1),
  CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE organization_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organization_id TINYINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_org_units_code (organization_id, code),
  UNIQUE KEY uq_org_units_id (organization_id, id),
  KEY idx_org_units_parent (organization_id, parent_id),
  CONSTRAINT fk_org_units_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_org_units_parent FOREIGN KEY (organization_id, parent_id) REFERENCES organization_units(organization_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE organization_members (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  organization_id TINYINT UNSIGNED NOT NULL,
  employee_code VARCHAR(40) NULL,
  department VARCHAR(100) NOT NULL DEFAULT '',
  unit_id BIGINT UNSIGNED NULL,
  position VARCHAR(100) NOT NULL DEFAULT '',
  customer_tier ENUM('STANDARD', 'VIP') NOT NULL DEFAULT 'STANDARD',
  role ENUM('OWNER', 'ADMIN', 'TECHNICIAN', 'USER') NOT NULL,
  joined_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_members_employee_code (organization_id, employee_code),
  KEY idx_members_org_role (organization_id, role),
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  KEY idx_members_unit (organization_id, unit_id),
  CONSTRAINT fk_members_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_members_unit FOREIGN KEY (organization_id, unit_id) REFERENCES organization_units(organization_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- roles / user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, role_id),
  KEY idx_user_roles_role_user (role_id, user_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- auth_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_refresh_token_hash (refresh_token_hash),
  KEY idx_auth_sessions_user_revoked (user_id, revoked_at),
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- categories / technician_categories
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_code (code),
  KEY idx_categories_parent (parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sla_settings (
  organization_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  policy JSON NOT NULL,
  CONSTRAINT fk_sla_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE technician_categories (
  user_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (user_id, category_id),
  KEY idx_technician_categories_category_user (category_id, user_id),
  CONSTRAINT fk_technician_categories_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_technician_categories_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------
CREATE TABLE knowledge_articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  visibility ENUM('PUBLIC','INTERNAL') NOT NULL DEFAULT 'INTERNAL',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  KEY idx_kb_category (category_id),
  FULLTEXT KEY ft_kb_content (title, body),
  CONSTRAINT fk_kb_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE RESTRICT ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_code VARCHAR(40) NOT NULL,
  requester_id BIGINT UNSIGNED NOT NULL,
  assignee_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  resolved_at DATETIME(3) NULL,
  response_due_at DATETIME(3) NULL,
  resolution_due_at DATETIME(3) NULL,
  first_response_at DATETIME(3) NULL,
  response_warning_due_at DATETIME(3) NULL,
  resolution_warning_due_at DATETIME(3) NULL,
  closed_at DATETIME(3) NULL,
  archived_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_display_code (display_code),
  KEY idx_tickets_requester_created (requester_id, created_at, id),
  KEY idx_tickets_assignee_status_created (assignee_id, status, created_at, id),
  KEY idx_tickets_status_created (status, created_at, id),
  KEY idx_tickets_response_due (response_due_at),
  KEY idx_tickets_resolution_due (resolution_due_at),
  KEY idx_tickets_category_created (category_id, created_at, id),
  CONSTRAINT fk_tickets_requester
    FOREIGN KEY (requester_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_tickets_assignee
    FOREIGN KEY (assignee_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_tickets_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_tickets_priority
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  CONSTRAINT chk_tickets_status
    CHECK (status IN ('NEW', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED')),
  CONSTRAINT chk_tickets_version
    CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ticket_number_rules (
  category_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  prefix VARCHAR(12) NOT NULL DEFAULT '',
  next_number INT UNSIGNED NOT NULL DEFAULT 1,
  digits TINYINT UNSIGNED NOT NULL DEFAULT 4,
  suffix VARCHAR(12) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ticket_number_rules (category_id) VALUES (0);

-- ---------------------------------------------------------------------------
-- ticket_comments
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ticket_comments_ticket_created (ticket_id, created_at, id),
  CONSTRAINT fk_ticket_comments_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ticket_comments_author
    FOREIGN KEY (author_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ticket_attachments
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  uploader_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  archived_at DATETIME(3) NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_attachments_storage_key (storage_key),
  KEY idx_ticket_attachments_ticket_created (ticket_id, created_at, id),
  CONSTRAINT fk_ticket_attachments_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ticket_attachments_uploader
    FOREIGN KEY (uploader_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ticket_events
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ticket_events_ticket_created (ticket_id, created_at, id),
  CONSTRAINT fk_ticket_events_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_ticket_events_actor
    FOREIGN KEY (actor_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_ticket_events_type
    CHECK (event_type IN (
      'CREATED',
      'ASSIGNEE_CHANGED',
      'STATUS_CHANGED',
      'CATEGORY_CHANGED',
      'PRIORITY_CHANGED',
      'DETAILS_CHANGED',
      'MERGED_INTO',
      'MERGED_TICKET'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inbound_ticket_mail (
  fingerprint CHAR(64) NOT NULL PRIMARY KEY,
  ticket_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket_id BIGINT UNSIGNED NULL,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read_created (user_id, read_at, created_at, id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_notifications_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets (id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_notifications_type
    CHECK (type IN ('TICKET_CREATED', 'ASSIGNED', 'RESOLVED', 'REOPENED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed dữ liệu mẫu (mật khẩu tất cả tài khoản: password)
-- bcrypt: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ---------------------------------------------------------------------------
SET @now = UTC_TIMESTAMP(3);
SET @password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

INSERT INTO roles (id, code, name) VALUES
  (1, 'USER', 'Người dùng'),
  (2, 'TECHNICIAN', 'Chuyên viên kỹ thuật'),
  (3, 'ADMIN', 'Quản trị viên');

INSERT INTO categories (id, code, name, is_active, created_at, updated_at) VALUES
  (1, 'SOFTWARE', 'Phần mềm', TRUE, @now, @now),
  (2, 'HARDWARE', 'Phần cứng', TRUE, @now, @now),
  (3, 'NETWORK', 'Mạng', TRUE, @now, @now),
  (4, 'ACCOUNT', 'Tài khoản', TRUE, @now, @now);

INSERT INTO users (id, email, password_hash, full_name, phone, is_active, created_at, updated_at) VALUES
  (1, 'user@example.test', @password_hash, 'Người gửi mẫu', NULL, TRUE, @now, @now),
  (2, 'tech@example.test', @password_hash, 'Kỹ thuật viên mẫu', NULL, TRUE, @now, @now),
  (3, 'admin@example.test', @password_hash, 'Quản trị mẫu', NULL, TRUE, @now, @now);

UPDATE users SET username = CASE id WHEN 1 THEN 'user' WHEN 2 THEN 'technical' WHEN 3 THEN 'admin' END
WHERE id IN (1, 2, 3);

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  (1, 1, @now),
  (2, 1, @now),
  (2, 2, @now),
  (3, 1, @now),
  (3, 3, @now);

INSERT INTO organizations (id, name, code, owner_id, created_at)
VALUES (1, 'Trạm Mèo', 'TRAM-MEO', 3, @now);
INSERT INTO organization_members (user_id, organization_id, role, joined_at) VALUES
  (1, 1, 'USER', @now), (2, 1, 'TECHNICIAN', @now), (3, 1, 'OWNER', @now);

INSERT INTO technician_categories (user_id, category_id, created_at) VALUES
  (2, 1, @now),
  (2, 2, @now),
  (2, 3, @now),
  (2, 4, @now);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  details JSON NOT NULL,
  avatar MEDIUMBLOB NULL,
  avatar_mime VARCHAR(32) NULL,
  CONSTRAINT user_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(10) NOT NULL,
  due_date DATE NULL,
  assignee_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  INDEX task_items_assignee_idx (assignee_id),
  INDEX task_items_creator_idx (created_by),
  CONSTRAINT task_items_assignee_fk FOREIGN KEY (assignee_id) REFERENCES users(id),
  CONSTRAINT task_items_creator_fk FOREIGN KEY (created_by) REFERENCES users(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
