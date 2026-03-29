import { ObjectId } from "mongodb"
import { z } from "zod"

// MongoDB документ
export type DeviceModel = {
  _id: ObjectId
  name: string
  archivedAt: Date | null
}

// Вхідні схеми
export const CreateDeviceModelSchema = z.object({
  name: z.string().min(1).max(100),
})

export const UpdateDeviceModelSchema = z.object({
  name: z.string().min(1).max(100),
})

// Input DTO
export type CreateDeviceModelDto = z.infer<typeof CreateDeviceModelSchema>
export type UpdateDeviceModelDto = z.infer<typeof UpdateDeviceModelSchema>

// Response DTO
export type DeviceModelResponseDto = {
  id: string
  name: string
}

// Маппінг
export function toDeviceModelResponse(doc: DeviceModel): DeviceModelResponseDto {
  return {
    id: doc._id.toString(),
    name: doc.name,
  }
}