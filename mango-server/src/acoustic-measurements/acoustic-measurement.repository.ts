import { Db, ObjectId, Sort } from "mongodb"
import {
  AcousticMeasurement,
  AcousticMeasurementsPaginatedDto,
  CreateAcousticMeasurementDto,
  GetAcousticMeasurementsQueryDto,
  PositionedAcousticMeasurement
} from "./acoustic-measurement.schema"

const COLLECTION = "acoustic-measurements"

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
): Promise<AcousticMeasurementsPaginatedDto> {
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

  if (query.height !== undefined) {
    const halfHeight = query.height / 2

    matchStage["location.latitude"] = {
      $gte: Math.max(query.latitude - query.radius, query.latitude - halfHeight),
      $lte: Math.min(query.latitude + query.radius, query.latitude + halfHeight),
    }
  }

  if (query.width !== undefined) {
    const halfWidth = query.width / 2

    matchStage["location.longitude"] = {
      $gte: Math.max(query.longitude - query.radius, query.longitude - halfWidth),
      $lte: Math.min(query.longitude + query.radius, query.longitude + halfWidth),
    }
  }

  const timeFilter: Record<string, unknown> = {}
  if (query.from) timeFilter["$gte"] = new Date(query.from)
  if (query.to) timeFilter["$lte"] = new Date(query.to)

  if (Object.keys(timeFilter).length > 0) {
    matchStage["measuredAt"] = timeFilter
  }

  const sortField = query.sortBy ?? "measuredAt"
  const sortDirection = query.sortOrder === "desc" ? -1 : 1
  const sort: Sort = { [sortField]: sortDirection }

  const skip = query.skip ?? 0
  const take = query.take ?? 20

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
    {
      $facet: {
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: take },
        ],
        total: [{ $count: "count" }],
        stats: [
          {
            $group: {
              _id: null,
              maxDba: { $max: "$maxDba" },
              avgDba: { $avg: "$avgDba" },
              devicesSet: { $addToSet: "$deviceId" }
            }
          },
          {
            $project: {
              maxDba: 1,
              avgDba: 1,
              uniqueDevices: { $size: "$devicesSet" }
            }
          }
        ]
      }
    }
  ]

  const [result] = await db.collection<AcousticMeasurement>(COLLECTION)
    .aggregate(pipeline).toArray()

  const total = result.total[0]?.count ?? 0
  const stats = {
    maxDba: result.stats[0]?.maxDba ?? null,
    avgDba: result.stats[0]?.avgDba ?? null,
    uniqueDevices: result.stats[0]?.uniqueDevices ?? 0,
  }

  return {
    data: result.data as PositionedAcousticMeasurement[],
    total,
    stats
  }
}
