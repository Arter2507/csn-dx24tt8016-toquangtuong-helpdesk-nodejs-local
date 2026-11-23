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
DROP TABLE IF EXISTS ticket_events;
DROP TABLE IF EXISTS ticket_attachments;
DROP TABLE IF EXISTS ticket_comments;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS technician_categories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS auth_sessions;
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
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
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
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_code (code)
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
CREATE TABLE tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requester_id BIGINT UNSIGNED NOT NULL,
  assignee_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  resolved_at DATETIME(3) NULL,
  closed_at DATETIME(3) NULL,
  archived_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tickets_requester_created (requester_id, created_at, id),
  KEY idx_tickets_assignee_status_created (assignee_id, status, created_at, id),
  KEY idx_tickets_status_created (status, created_at, id),
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
    CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  CONSTRAINT chk_tickets_version
    CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- ticket_comments
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
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
      'DETAILS_CHANGED'
    ))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
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

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  (1, 1, @now),
  (2, 1, @now),
  (2, 2, @now),
  (3, 1, @now),
  (3, 3, @now);

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
