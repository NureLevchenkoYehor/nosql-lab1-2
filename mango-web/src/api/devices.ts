import { api } from "./client"
import type { PaginatedResponse } from "./common"

export type DeviceStatus = "in_stock" | "deployed" | "fixing" | "decommissioned"

export type DeviceResponseDto = {
  id: string
  modelId: string
  serialNumber: string
  status: DeviceStatus
  customName?: string
  batteryLevel: number | null
  lastSeenAt: string | null // Дати з JSON приходять як ISO рядки
  isActive: boolean
}

export type DeviceCreatedResponseDto = DeviceResponseDto & {
  apiKey: string
}

export type GetDevicesQuery = {
  modelId?: string
  status?: DeviceStatus
  active?: "true" | "false"
  serial?: string
  name?: string
  sortBy?: "modelId" | "serialNumber" | "customName" | "batteryLevel"
  sortOrder?: "asc" | "desc"
  take?: number
  skip?: number
}

export type CreateDeviceBody = {
  modelId: string
  serialNumber: string
  customName?: string
}

export type UpdateDeviceBody = {
  status?: DeviceStatus
  customName?: string
}

export function getDevices(query: GetDevicesQuery = {}): Promise<PaginatedResponse<DeviceResponseDto>> {
  const params = new URLSearchParams()
  if (query.modelId) params.set("modelId", query.modelId)
  if (query.status) params.set("status", query.status)
  if (query.active) params.set("active", query.active)
  if (query.serial) params.set("serial", query.serial)
  if (query.name) params.set("name", query.name)
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.sortOrder) params.set("sortOrder", query.sortOrder)
  if (query.take !== undefined) params.set("take", String(query.take))
  if (query.skip !== undefined) params.set("skip", String(query.skip))

  const qs = params.toString()
  return api.get(`/devices${qs ? `?${qs}` : ""}`)
}

export function createDevice(body: CreateDeviceBody): Promise<DeviceCreatedResponseDto> {
  return api.post("/devices", body)
}

export function updateDevice(id: string, body: UpdateDeviceBody): Promise<void> {
  return api.patch(`/devices/${id}`, body)
}

export function deleteDevice(id: string): Promise<void> {
  return api.delete(`/devices/${id}`)
}

export function rotateDeviceKey(id: string): Promise<{ apiKey: string }> {
  return api.post(`/devices/${id}/rotate`, {})
}