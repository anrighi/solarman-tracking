SET @rename_production = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'produzione_w'
    )
    AND NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'production_w'
    ),
    'ALTER TABLE energy_samples_minute RENAME COLUMN produzione_w TO production_w',
    'SELECT 1'
  )
);

PREPARE rename_production_stmt FROM @rename_production;
EXECUTE rename_production_stmt;
DEALLOCATE PREPARE rename_production_stmt;

SET @rename_consumption = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'consumo_w'
    )
    AND NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'consumption_w'
    ),
    'ALTER TABLE energy_samples_minute RENAME COLUMN consumo_w TO consumption_w',
    'SELECT 1'
  )
);

PREPARE rename_consumption_stmt FROM @rename_consumption;
EXECUTE rename_consumption_stmt;
DEALLOCATE PREPARE rename_consumption_stmt;

SET @add_grid_import = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'grid_import_w'
    ),
    'ALTER TABLE energy_samples_minute ADD COLUMN grid_import_w DECIMAL(12, 2) NULL AFTER battery_power_w',
    'SELECT 1'
  )
);

PREPARE add_grid_import_stmt FROM @add_grid_import;
EXECUTE add_grid_import_stmt;
DEALLOCATE PREPARE add_grid_import_stmt;

SET @add_grid_export = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'grid_export_w'
    ),
    'ALTER TABLE energy_samples_minute ADD COLUMN grid_export_w DECIMAL(12, 2) NULL AFTER grid_import_w',
    'SELECT 1'
  )
);

PREPARE add_grid_export_stmt FROM @add_grid_export;
EXECUTE add_grid_export_stmt;
DEALLOCATE PREPARE add_grid_export_stmt;

SET @add_battery_charge = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'battery_charge_w'
    ),
    'ALTER TABLE energy_samples_minute ADD COLUMN battery_charge_w DECIMAL(12, 2) NULL AFTER grid_export_w',
    'SELECT 1'
  )
);

PREPARE add_battery_charge_stmt FROM @add_battery_charge;
EXECUTE add_battery_charge_stmt;
DEALLOCATE PREPARE add_battery_charge_stmt;

SET @add_battery_discharge = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'battery_discharge_w'
    ),
    'ALTER TABLE energy_samples_minute ADD COLUMN battery_discharge_w DECIMAL(12, 2) NULL AFTER battery_charge_w',
    'SELECT 1'
  )
);

PREPARE add_battery_discharge_stmt FROM @add_battery_discharge;
EXECUTE add_battery_discharge_stmt;
DEALLOCATE PREPARE add_battery_discharge_stmt;

SET @add_irradiance = (
  SELECT IF(
    NOT EXISTS(
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'energy_samples_minute'
        AND COLUMN_NAME = 'irradiance'
    ),
    'ALTER TABLE energy_samples_minute ADD COLUMN irradiance DECIMAL(12, 2) NULL AFTER battery_discharge_w',
    'SELECT 1'
  )
);

PREPARE add_irradiance_stmt FROM @add_irradiance;
EXECUTE add_irradiance_stmt;
DEALLOCATE PREPARE add_irradiance_stmt;
