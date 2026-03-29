import { ObjectId } from "mongodb"
import { z } from "zod"

// MongoDB документ
export type Location = {
  _id: ObjectId
  deviceId: ObjectId
  longitude: number
  latitude: number
  recordedAt: Date
}

// Вхідна схема
export const CreateLocationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  recordedAt: z.iso.datetime(),
})

// Input DTO
export type CreateLocationDto = z.infer<typeof CreateLocationSchema>

// Response DTO
export type LocationResponseDto = {
  id: string
  deviceId: string
  longitude: number
  latitude: number
  recordedAt: Date
}

// Маппінг
export function toLocationResponse(doc: Location): LocationResponseDto {
  return {
    id: doc._id.toString(),
    deviceId: doc.deviceId.toString(),
    longitude: doc.longitude,
    latitude: doc.latitude,
    recordedAt: doc.recordedAt,
  }
}