ALTER TABLE users
  ADD COLUMN username VARCHAR(32) NULL,
  ADD UNIQUE KEY uq_users_username (username);

UPDATE users SET username = CASE email
  WHEN 'admin@example.test' THEN 'admin'
  WHEN 'tech@example.test' THEN 'technical'
  WHEN 'user@example.test' THEN 'user'
END
WHERE email IN ('admin@example.test', 'tech@example.test', 'user@example.test');
