import { Db, ObjectId } from "mongodb"
import { DeviceModel, CreateDeviceModelDto, UpdateDeviceModelDto, GetDeviceModelsQueryDto } from "./device-model.schema"
import { PaginatedResponseDto, stripUndefined } from "../common/utils"

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

export async function getDeviceModels(
  db: Db,
  query: GetDeviceModelsQueryDto
): Promise<PaginatedResponseDto<DeviceModel>> {
  const filter: Record<string, unknown> = { archivedAt: null }

  if (query.search) {
    filter["name"] = { $regex: query.search, $options: "i" }
  }

  const sortField = query.sortBy ?? "name"
  const sortDirection = query.sortOrder === "desc" ? -1 : 1
  const skip = query.skip ?? 0
  const take = query.take ?? 20

  const [result] = await db.collection<DeviceModel>(COLLECTION).aggregate([
    { $match: filter },
    {
      $facet: {
        data: [
          { $sort: { [sortField]: sortDirection } },
          { $skip: skip },
          { $limit: take },
        ],
        total: [{ $count: "count" }],
      }
    }
  ]).toArray()

  const total = result.total[0]?.count ?? 0

  return {
    data: result.data as DeviceModel[],
    total,
  }
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
  const modelId = new ObjectId(id)
  const now = new Date()

  await db.collection<DeviceModel>(COLLECTION).updateOne(
    { _id: modelId },
    { $set: { archivedAt: now } }
  )

  await db.collection("devices").updateMany(
    { modelId: modelId, archivedAt: null },
    { $set: { archivedAt: now, } }
  )
}