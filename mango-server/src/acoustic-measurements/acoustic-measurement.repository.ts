import { Db, ObjectId } from "mongodb"
import {
  AcousticMeasurement,
  CreateAcousticMeasurementDto,
  GetAcousticMeasurementsQueryDto,
  PositionedAcousticMeasurement
} from "./acoustic-measurement.schema"

const COLLECTION = "records"

export async function createAcousticMeasurement(
  db: Db,
  deviceId: string,
  locationId: string,
  dto: CreateAcousticMeasurementDto
): Promise<AcousticMeasurement> {

  const { measuredAt, ...rest } = dto

  const doc: Omit<AcousticMeasurement, "_id"> = {
    ...rest,
    deviceId: new ObjectId(deviceId),
    locationId: new ObjectId(locationId),
    measuredAt: new Date(measuredAt),
  }

  const result = await db.collection<AcousticMeasurement>(COLLECTION).insertOne(doc as AcousticMeasurement)
  return { _id: result.insertedId, ...doc }
}

export async function getAcousticMeasurements(
  db: Db,
  query: GetAcousticMeasurementsQueryDto
): Promise<(AcousticMeasurement & { longitude: number, latitude: number })[]> {
  const radiusFilter = (centerPoint: number, radius: number) => {
    return {
      $gte: centerPoint - radius,
      $lte: centerPoint + radius,
    }
  }

  const matchStage: Record<string, unknown> = {
    "location.longitude": radiusFilter(query.longitude, query.radius),
    "location.latitude": radiusFilter(query.latitude, query.radius),
  }

  const timeFilter: Record<string, unknown> = {}
  if (query.from) timeFilter["$gte"] = new Date(query.from)
  if (query.to) timeFilter["$lte"] = new Date(query.to)

  if (Object.keys(timeFilter).length > 0) {
    matchStage["measuredAt"] = timeFilter
  }


  const pipeline = [
    {
      $lookup: {
        from: "locations",
        foreignField: "_id",
        localField: "locationId",
        as: "location",
      }
    },
    {
      $unwind: "$location"
    },
    {
      $match: matchStage
    },
    {
      $addFields: {
        longitude: "$location.longitude",
        latitude: "$location.latitude",
      }
    },
  ]

  const records = await db.collection<AcousticMeasurement>(COLLECTION).aggregate(pipeline).toArray() as PositionedAcousticMeasurement[]

  return records;
}
