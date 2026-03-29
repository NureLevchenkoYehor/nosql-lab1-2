import { Db, ObjectId } from "mongodb"
import {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  UpdateDeviceStateDto
} from "./device.schema"
import { stripUndefined } from "../common/utils"

const COLLECTION = "devices"

export async function createDevice(db: Db, dto: CreateDeviceDto, apiKeyHash: string): Promise<Device | null> {
  const existing = await db.collection<Device>(COLLECTION).findOne({
    serialNumber: dto.serialNumber,
    archivedAt: null
  })
  if (existing) return null

  const doc: Omit<Device, "_id"> = {
    ...dto,
    modelId: new ObjectId(dto.modelId),
    apiKeyHash,
    status: "in_stock",
    batteryLevel: null,
    lastSeenAt: null,
    archivedAt: null,
  }

  const result = await db.collection<Device>(COLLECTION).insertOne(doc as Device)
  return { _id: result.insertedId, ...doc }
}

export async function getDevices(db: Db): Promise<Device[]> {
  return db.collection<Device>(COLLECTION).find({ archivedAt: null }).toArray()
}

export async function getDeviceById(db: Db, id: string): Promise<Device | null> {
  return db.collection<Device>(COLLECTION).findOne({ _id: new ObjectId(id) })
}

export async function getDeviceByApiKeyHash(db: Db, apiKeyHash: string): Promise<Device | null> {
  return db.collection<Device>(COLLECTION).findOne({ apiKeyHash, archivedAt: null })
}

export async function updateDevice(db: Db, id: string, dto: UpdateDeviceDto): Promise<void> {
  await db.collection<Device>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: stripUndefined(dto) }
  )
}

export async function updateDeviceState(db: Db, id: string, dto: UpdateDeviceStateDto): Promise<void> {
  await db.collection<Device>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        batteryLevel: dto.batteryLevel,
        lastSeenAt: new Date(dto.recordedAt),
      }
    }
  )
}

export async function updateDeviceApiKey(db: Db, id: string, apiKeyHash: string): Promise<void> {
  await db.collection<Device>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { apiKeyHash } }
  )
}

export async function archiveDevice(db: Db, id: string): Promise<void> {
  await db.collection<Device>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { archivedAt: new Date() } }
  )
}

export async function updateDeviceLastSeen(db: Db, id: string): Promise<void> {
  await db.collection<Device>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { lastSeenAt: new Date() } }
  )
}