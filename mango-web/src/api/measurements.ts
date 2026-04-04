import { api } from "./client"
import type { PaginatedResponse } from "./common"

export type GetAcousticMeasurementsQuery = {
  longitude: number
  latitude: number
  radius: number
  width?: number
  height?: number
  from?: string
  to?: string
  sortBy?: "measuredAt" | "maxDba" | "avgDba"
  sortOrder?: "asc" | "desc"
  take?: number
  skip?: number
}

export type AcousticMeasurementResponseDto = {
  id: string
  deviceId: string
  locationId: string
  location: {
    longitude: number
    latitude: number
  }
  maxDba: number
  avgDba: number
  intervalS: number
  measuredAt: string // У JSON дати приходять як ISO-рядки
}

export type AcousticMeasurementsPaginatedDto = PaginatedResponse<AcousticMeasurementResponseDto> & {
  stats: {
    maxDba: number | null
    avgDba: number | null
    uniqueDevices: number
  }
}

export function getMeasurements(query: GetAcousticMeasurementsQuery): Promise<AcousticMeasurementsPaginatedDto> {
  const params = new URLSearchParams()

  params.set("longitude", String(query.longitude))
  params.set("latitude", String(query.latitude))
  params.set("radius", String(query.radius)) // Припускаю, що радіус на бекенді в метрах

  if (query.width !== undefined) params.set("width", String(query.width))
  if (query.height !== undefined) params.set("height", String(query.height))
  if (query.from) params.set("from", query.from)
  if (query.to) params.set("to", query.to)
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.sortOrder) params.set("sortOrder", query.sortOrder)
  if (query.take !== undefined) params.set("take", String(query.take))
  if (query.skip !== undefined) params.set("skip", String(query.skip))

  const qs = params.toString()
  return api.get(`/devices/acoustic-measurements${qs ? `?${qs}` : ""}`)
}