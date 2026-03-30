import { Db, ObjectId, Sort } from "mongodb"
import {
  AcousticMeasurement,
  CreateAcousticMeasurementDto,
  GetAcousticMeasurementsQueryDto,
  PositionedAcousticMeasurement
} from "./acoustic-measurement.schema"
import { PaginatedResponseDto } from "../common/utils"

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
): Promise<PaginatedResponseDto<PositionedAcousticMeasurement>> {
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
      }
    }
  ]

  const [result] = await db.collection<AcousticMeasurement>(COLLECTION)
    .aggregate(pipeline).toArray()

  const total = result.total[0]?.count ?? 0

  return {
    data: result.data as PositionedAcousticMeasurement[],
    total,
  }
}
