import { createHash } from 'node:crypto'
import { gunzipSync, gzipSync } from 'node:zlib'

import type { ArchiveManifest, ArchiveSamplePayload } from '@/features/archive/types'
import type { EnergySampleInsert } from '@/server/db/schema'

export function samplesToPayload(samples: EnergySampleInsert[]): ArchiveSamplePayload[] {
  return samples.map((sample) => ({
    recordedAt: sample.recordedAt.toISOString(),
    productionW: sample.productionW,
    consumptionW: sample.consumptionW,
    batterySoc: sample.batterySoc,
    batteryPowerW: sample.batteryPowerW,
    gridImportW: sample.gridImportW,
    gridExportW: sample.gridExportW,
    batteryChargeW: sample.batteryChargeW,
    batteryDischargeW: sample.batteryDischargeW,
    irradiance: sample.irradiance,
  }))
}

export function encodeDayGzip(samples: ArchiveSamplePayload[]) {
  const lines = samples.map((sample) => JSON.stringify(sample)).join('\n')
  const body = lines.length > 0 ? `${lines}\n` : ''
  const buffer = gzipSync(Buffer.from(body, 'utf8'))
  const contentHash = createHash('sha256').update(body).digest('hex')

  return { buffer, contentHash, rowCount: samples.length }
}

export function decodeDayGzip(buffer: Buffer): ArchiveSamplePayload[] {
  const text = gunzipSync(buffer).toString('utf8').trim()
  if (!text) {
    return []
  }

  const samples: ArchiveSamplePayload[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    samples.push(JSON.parse(trimmed) as ArchiveSamplePayload)
  }

  return samples
}

export function contentHashForPayload(samples: ArchiveSamplePayload[]) {
  const lines = samples.map((sample) => JSON.stringify(sample)).join('\n')
  const body = lines.length > 0 ? `${lines}\n` : ''
  return createHash('sha256').update(body).digest('hex')
}

export function payloadToInserts(
  stationId: number,
  samples: ArchiveSamplePayload[],
): EnergySampleInsert[] {
  return samples.map((sample) => ({
    stationId,
    recordedAt: new Date(sample.recordedAt),
    productionW: sample.productionW,
    consumptionW: sample.consumptionW,
    batterySoc: sample.batterySoc,
    batteryPowerW: sample.batteryPowerW,
    gridImportW: sample.gridImportW,
    gridExportW: sample.gridExportW,
    batteryChargeW: sample.batteryChargeW,
    batteryDischargeW: sample.batteryDischargeW,
    irradiance: sample.irradiance,
  }))
}

export function emptyManifest(stationId: number): ArchiveManifest {
  return {
    stationId,
    updatedAt: new Date().toISOString(),
    days: {},
  }
}

export function parseManifest(raw: string, stationId: number): ArchiveManifest {
  const parsed = JSON.parse(raw) as Partial<ArchiveManifest>

  return {
    stationId: parsed.stationId ?? stationId,
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    days: parsed.days ?? {},
  }
}
