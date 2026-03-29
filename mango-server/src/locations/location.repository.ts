import { Db, ObjectId } from "mongodb"
import { Location, CreateLocationDto } from "./location.schema"

const COLLECTION = "locations"

export async function createLocation(db: Db, deviceId: string, dto: CreateLocationDto): Promise<Location> {
  const { recordedAt, ...rest } = dto

  const doc: Omit<Location, "_id"> = {
    ...rest,
    deviceId: new ObjectId(deviceId),
    recordedAt: new Date(recordedAt),
  }

  const result = await db.collection<Location>(COLLECTION).insertOne(doc as Location)
  return { _id: result.insertedId, ...doc }
}

export async function getLastLocation(db: Db, deviceId: string): Promise<Location | null> {
  return db.collection<Location>(COLLECTION).findOne(
    { deviceId: new ObjectId(deviceId) },
    { sort: { recordedAt: -1 } }
  )
}