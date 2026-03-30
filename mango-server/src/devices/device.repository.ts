import { Db, ObjectId, Sort } from "mongodb"
import {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  UpdateDeviceStateDto,
  GetDevicesQueryDto
} from "./device.schema"
import { DEVICE_ACTIVE_THRESHOLD_DAYS, stripUndefined } from "../common/utils"

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

export async function getDevices(db: Db, query: GetDevicesQueryDto): Promise<Device[]> {
  const filter: Record<string, unknown> = { archivedAt: null }

  if (query.modelId) {
    filter["modelId"] = new ObjectId(query.modelId)
  }

  if (query.status) {
    filter["status"] = query.status
  }

  if (query.active !== undefined) {
    const threshold = new Date(Date.now() - DEVICE_ACTIVE_THRESHOLD_DAYS * 86400000)

    if (query.active === "true") {
      filter["lastSeenAt"] = { $gte: threshold }
    } else {
      filter["$or"] = [
        { lastSeenAt: null },
        { lastSeenAt: { $lt: threshold } },
      ]
    }
  }

  if (query.serial) {
    filter["serialNumber"] = { $regex: query.serial, $options: "i" }
  }

  if (query.name) {
    filter["customName"] = { $regex: query.name, $options: "i" }
  }

  const sortField = query.sortBy ?? "serialNumber"
  const sortDirection = query.sortOrder === "desc" ? -1 : 1
  const sort: Sort = { [sortField]: sortDirection }

  const skip = query.skip ?? 0
  const take = query.take ?? 20

  return db.collection<Device>(COLLECTION)
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(take)
    .toArray()
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