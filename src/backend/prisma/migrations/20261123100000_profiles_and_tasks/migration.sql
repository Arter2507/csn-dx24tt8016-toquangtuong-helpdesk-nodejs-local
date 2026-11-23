CREATE TABLE user_profiles (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  details JSON NOT NULL,
  avatar MEDIUMBLOB NULL,
  avatar_mime VARCHAR(32) NULL,
  CONSTRAINT user_profiles_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE task_items (
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
