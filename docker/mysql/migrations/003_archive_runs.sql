CREATE TABLE IF NOT EXISTS archive_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  station_id INT NOT NULL,
  direction ENUM('export', 'hydrate') NOT NULL,
  day_from CHAR(10) NOT NULL,
  day_to CHAR(10) NOT NULL,
  days_count INT NOT NULL DEFAULT 0,
  rows_affected INT NOT NULL DEFAULT 0,
  status ENUM('success', 'failed', 'partial') NOT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_archive_created (created_at),
  KEY idx_archive_station_created (station_id, created_at)
);
