CREATE TABLE IF NOT EXISTS energy_samples_minute (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  station_id INT NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  produzione_w DECIMAL(12, 2) NULL,
  consumo_w DECIMAL(12, 2) NULL,
  battery_soc DECIMAL(5, 2) NULL,
  battery_power_w DECIMAL(12, 2) NULL,
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
