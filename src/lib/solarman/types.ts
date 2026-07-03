export type SolarmanTokenResponse = {
  success: boolean
  access_token?: string
  token_type?: string
  expires_in?: string
  msg?: string | null
}

export type SolarmanRealtimeResponse = {
  success: boolean
  generationPower?: number | null
  usePower?: number | null
  batterySoc?: number | null
  batteryPower?: number | null
  lastUpdateTime?: number | null
  msg?: string | null
}

export type SolarmanHistoryItem = {
  dateTime?: string | number | null
  generationPower?: number | null
  usePower?: number | null
  batterySoc?: number | null
  batteryPower?: number | null
  year?: number | null
  month?: number | null
  day?: number | null
}

export type SolarmanHistoryResponse = {
  success: boolean
  stationDataItems?: SolarmanHistoryItem[]
  msg?: string | null
}

export type SolarmanClientConfig = {
  apiUrl: string
  appId: string
  appSecret: string
  email: string
  password: string
  stationId: number
}
