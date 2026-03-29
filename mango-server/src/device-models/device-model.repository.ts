import { Db, ObjectId } from "mongodb"
import { DeviceModel, CreateDeviceModelDto, UpdateDeviceModelDto } from "./device-model.schema"
import { stripUndefined } from "../common/utils"

const COLLECTION = "device-models"

export async function createDeviceModel(db: Db, dto: CreateDeviceModelDto): Promise<DeviceModel | null> {
  const existing = await db.collection<DeviceModel>(COLLECTION).findOne({ name: dto.name, archivedAt: null })
  if (existing) return null

  const doc: Omit<DeviceModel, "_id"> = {
    ...dto,
    archivedAt: null,
  }

  const result = await db.collection<DeviceModel>(COLLECTION).insertOne(doc as DeviceModel)
  return { _id: result.insertedId, ...doc }
}

export async function getDeviceModels(db: Db): Promise<DeviceModel[]> {
  return db.collection<DeviceModel>(COLLECTION).find({ archivedAt: null }).toArray()
}

export async function getDeviceModelById(db: Db, id: string): Promise<DeviceModel | null> {
  return db.collection<DeviceModel>(COLLECTION).findOne({ _id: new ObjectId(id) })
}

export async function updateDeviceModel(db: Db, id: string, dto: UpdateDeviceModelDto): Promise<void> {
  await db.collection<DeviceModel>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: stripUndefined(dto) }
  )
}

export async function archiveDeviceModel(db: Db, id: string): Promise<void> {
  await db.collection<DeviceModel>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { archivedAt: new Date() } }
  )
}