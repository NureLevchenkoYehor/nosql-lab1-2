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

  // Переводимо метри в градуси для довготи (longitude), враховуючи кривизну Землі
  const radiusInDegreesLng = query.radius / (111320 * Math.cos(query.latitude * (Math.PI / 180)));
  // Переводимо метри в градуси для широти (latitude)
  const radiusInDegreesLat = query.radius / 111320;

  const matchStage: Record<string, unknown> = {
    "location.longitude": radiusFilter(radiusInDegreesLng, query.radius),
    "location.latitude": radiusFilter(radiusInDegreesLat, query.radius),
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
  }

  return {
    data: result.data as PositionedAcousticMeasurement[],
    total,
    stats
  }
}
