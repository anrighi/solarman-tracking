CREATE TABLE IF NOT EXISTS backup_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  status ENUM('success', 'failed', 'upload_failed') NOT NULL,
  source ENUM('scheduled', 'manual') NOT NULL,
  remote_synced BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_backup_created (created_at),
  KEY idx_backup_status_created (status, created_at)
);
