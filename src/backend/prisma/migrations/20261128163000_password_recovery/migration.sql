ALTER TABLE users
  ADD COLUMN password_reset_token_hash CHAR(64) NULL,
  ADD COLUMN password_reset_expires_at DATETIME(3) NULL,
  ADD UNIQUE KEY uq_users_password_reset_token_hash (password_reset_token_hash);
