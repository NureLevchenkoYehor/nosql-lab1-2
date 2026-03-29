import { ObjectId } from "mongodb"
import { z } from "zod"

// MongoDB документ
export type AcousticMeasurement = {
  _id: ObjectId
  deviceId: ObjectId
  locationId: ObjectId
  maxDba: number
  avgDba: number
  intervalS: number
  measuredAt: Date
}

export type PositionedAcousticMeasurement = AcousticMeasurement & { longitude: number, latitude: number };


// Вхідна схема
export const CreateAcousticMeasurementSchema = z.object({
  maxDba: z.number(),
  avgDba: z.number(),
  intervalS: z.number().positive(),
  measuredAt: z.iso.datetime(),
})

// Query схема
export const GetAcousticMeasurementsQuerySchema = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  radius: z.coerce.number().positive(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
})

// Input DTO
export type CreateAcousticMeasurementDto = z.infer<typeof CreateAcousticMeasurementSchema>
export type GetAcousticMeasurementsQueryDto = z.infer<typeof GetAcousticMeasurementsQuerySchema>

// Response DTO
export type AcousticMeasurementResponseDto = {
  id: string
  deviceId: string
  location: {
    longitude: number
    latitude: number
  }
  maxDba: number
  avgDba: number
  intervalS: number
  measuredAt: Date
}

// Маппінг
export function toAcousticMeasurementResponse(doc: PositionedAcousticMeasurement): AcousticMeasurementResponseDto {
  return {
    id: doc._id.toString(),
    deviceId: doc.deviceId.toString(),
    location: {
      longitude: doc.longitude,
      latitude: doc.latitude,
    },
    maxDba: doc.maxDba,
    avgDba: doc.avgDba,
    intervalS: doc.intervalS,
    measuredAt: doc.measuredAt,
  }
}