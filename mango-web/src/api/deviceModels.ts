import { api } from "./client"

export type DeviceModel = {
  id: string
  name: string
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
}

export type GetDeviceModelsQuery = {
  search?: string
  sortBy?: "name"
  sortOrder?: "asc" | "desc"
  take?: number
  skip?: number
}

export type CreateDeviceModelBody = {
  name: string
}

export type UpdateDeviceModelBody = {
  name: string
}

export function getDeviceModels(query: GetDeviceModelsQuery = {}): Promise<PaginatedResponse<DeviceModel>> {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.sortBy) params.set("sortBy", query.sortBy)
  if (query.sortOrder) params.set("sortOrder", query.sortOrder)
  if (query.take !== undefined) params.set("take", String(query.take))
  if (query.skip !== undefined) params.set("skip", String(query.skip))

  const qs = params.toString()
  return api.get(`/devices/models${qs ? `?${qs}` : ""}`)
}

export function createDeviceModel(body: CreateDeviceModelBody): Promise<DeviceModel> {
  return api.post("/devices/models", body)
}

export function updateDeviceModel(id: string, body: UpdateDeviceModelBody): Promise<void> {
  return api.patch(`/devices/models/${id}`, body)
}

export function deleteDeviceModel(id: string): Promise<void> {
  return api.delete(`/devices/models/${id}`)
}