CREATE TABLE IF NOT EXISTS energy_samples_minute (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  station_id INT NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  production_w DECIMAL(12, 2) NULL,
  consumption_w DECIMAL(12, 2) NULL,
  battery_soc DECIMAL(5, 2) NULL,
  battery_power_w DECIMAL(12, 2) NULL,
  grid_import_w DECIMAL(12, 2) NULL,
  grid_export_w DECIMAL(12, 2) NULL,
  battery_charge_w DECIMAL(12, 2) NULL,
  battery_discharge_w DECIMAL(12, 2) NULL,
  irradiance DECIMAL(12, 2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_station_recorded (station_id, recorded_at),
  KEY idx_recorded_at (recorded_at)
);

CREATE TABLE IF NOT EXISTS energy_samples_raw (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(32) NOT NULL,
  station_id INT NOT NULL,
  fetched_at DATETIME(3) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_raw_station_fetched (station_id, fetched_at)
);

CREATE TABLE IF NOT EXISTS sync_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_name VARCHAR(64) NOT NULL,
  watermark_at DATETIME(3) NULL,
  last_run_at DATETIME(3) NULL,
  last_status ENUM('idle', 'running', 'success', 'error') NOT NULL DEFAULT 'idle',
  last_error TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_job_name (job_name)
);

CREATE TABLE IF NOT EXISTS app_config (
  id INT PRIMARY KEY DEFAULT 1,
  config JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_single_config CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS backfill_checkpoint (
  station_id INT PRIMARY KEY,
  first_data_at DATETIME(3) NULL,
  last_synced_at DATETIME(3) NULL,
  no_data_before DATETIME(3) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backfill_gap (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  station_id INT NOT NULL,
  gap_start DATETIME(3) NOT NULL,
  gap_end DATETIME(3) NOT NULL,
  status ENUM('open', 'filled', 'ignored') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gap_station_status (station_id, status)
);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  alert_type VARCHAR(64) NOT NULL,
  station_id INT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_telegram_alert_sent (alert_type, station_id, sent_at)
);

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
