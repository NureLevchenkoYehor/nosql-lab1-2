import { ObjectId } from "mongodb"
import { z } from "zod"

export const DEVICE_STATUSES = ["in_stock", "deployed", "fixing", "decommissioned"] as const
export type DeviceStatus = typeof DEVICE_STATUSES[number]

// MongoDB документ
export type Device = {
  _id: ObjectId
  modelId: ObjectId
  serialNumber: string
  apiKeyHash: string
  status: DeviceStatus
  customName?: string
  batteryLevel: number | null
  lastSeenAt: Date | null
  archivedAt: Date | null
}

// Вхідні схеми
export const CreateDeviceSchema = z.object({
  modelId: z.string().length(24),
  serialNumber: z.string().max(100),
  customName: z.string().max(100).optional(),
})

export const UpdateDeviceSchema = z.object({
  status: z.enum(DEVICE_STATUSES).optional(),
  customName: z.string().max(100).optional(),
})

export const UpdateDeviceStateSchema = z.object({
  batteryLevel: z.number().min(0).max(100),
  recordedAt: z.iso.datetime(),
})

// Input DTO
export type CreateDeviceDto = z.infer<typeof CreateDeviceSchema>
export type UpdateDeviceDto = z.infer<typeof UpdateDeviceSchema>
export type UpdateDeviceStateDto = z.infer<typeof UpdateDeviceStateSchema>

// Response DTO
export type DeviceResponseDto = {
  id: string
  modelId: string
  serialNumber: string
  status: DeviceStatus
  customName?: string
  batteryLevel: number | null
  lastSeenAt: Date | null
}

export type DeviceCreatedResponseDto = DeviceResponseDto & {
  apiKey: string
}

// Маппінг
export function toDeviceResponse(doc: Device): DeviceResponseDto {
  return {
    id: doc._id.toString(),
    modelId: doc.modelId.toString(),
    serialNumber: doc.serialNumber,
    status: doc.status,
    customName: doc.customName,
    batteryLevel: doc.batteryLevel,
    lastSeenAt: doc.lastSeenAt,
  }
}