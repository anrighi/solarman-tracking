export type SolarmanStationPowerFields = {
  purchasePower?: number | null
  gridPower?: number | null
  wirePower?: number | null
  chargePower?: number | null
  dischargePower?: number | null
  irradiateIntensity?: number | null
}

export type NormalizedStationPowerFields = {
  gridImportW: number | null
  gridExportW: number | null
  batteryChargeW: number | null
  batteryDischargeW: number | null
  irradiance: number | null
}

function toPositiveW(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }

  return Math.abs(value)
}

function gridImportFromWire(wirePower: number): number | null {
  if (wirePower < 0) {
    return Math.abs(wirePower)
  }

  return null
}

function gridExportFromWire(wirePower: number): number | null {
  if (wirePower > 0) {
    return wirePower
  }

  return null
}

export function normalizeStationPowerFields(
  fields: SolarmanStationPowerFields,
): NormalizedStationPowerFields {
  let gridImportW: number | null = null
  let gridExportW: number | null = null

  if (fields.purchasePower !== null && fields.purchasePower !== undefined) {
    gridImportW = toPositiveW(fields.purchasePower)
  }

  if (fields.gridPower !== null && fields.gridPower !== undefined) {
    gridExportW = toPositiveW(fields.gridPower)
  }

  if (gridImportW === null && fields.wirePower !== null && fields.wirePower !== undefined) {
    gridImportW = gridImportFromWire(fields.wirePower)
  }

  if (gridExportW === null && fields.wirePower !== null && fields.wirePower !== undefined) {
    gridExportW = gridExportFromWire(fields.wirePower)
  }

  return {
    gridImportW,
    gridExportW,
    batteryChargeW: toPositiveW(fields.chargePower),
    batteryDischargeW: toPositiveW(fields.dischargePower),
    irradiance: fields.irradiateIntensity ?? null,
  }
}
