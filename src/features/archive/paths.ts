export function getArchivePrefix() {
  return process.env.CUBBIT_ARCHIVE_PREFIX ?? 'archive'
}

export function stationArchivePrefix(stationId: number) {
  return `${getArchivePrefix()}/station/${stationId}`
}

export function dayObjectKey(stationId: number, dateKey: string) {
  const [year, month, day] = dateKey.split('-')
  return `${stationArchivePrefix(stationId)}/${year}/${month}/${day}.json.gz`
}

export function manifestObjectKey(stationId: number) {
  return `${stationArchivePrefix(stationId)}/manifest.json`
}

export function parseDayKeyFromObjectKey(key: string) {
  const match = key.match(/\/(\d{4})\/(\d{2})\/(\d{2})\.json\.gz$/)
  if (!match) {
    return null
  }

  return `${match[1]}-${match[2]}-${match[3]}`
}

export function listDateKeysInMonth(year: number, month: number) {
  const keys: string[] = []
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  for (let day = 1; day <= daysInMonth; day += 1) {
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    keys.push(`${year}-${monthStr}-${dayStr}`)
  }

  return keys
}

export function monthPrefix(stationId: number, year: number, month: number) {
  const monthStr = String(month).padStart(2, '0')
  return `${stationArchivePrefix(stationId)}/${year}/${monthStr}/`
}
