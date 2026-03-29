import { Db, ObjectId } from "mongodb"
import { Profile, CreateProfileDto, UpdateProfileDto } from "./profile.schema"
import { stripUndefined } from "../common/utils"
import { hashPassword } from "../common/crypto"

const COLLECTION = "profiles"

export async function createProfile(db: Db, dto: CreateProfileDto): Promise<Profile | null> {
  const existing = await db.collection<Profile>(COLLECTION).findOne({ login: dto.login, archivedAt: null })
  if (existing) return null

  const { password, ...rest } = dto

  const doc: Omit<Profile, "_id"> = {
    ...rest,
    passwordHash: await hashPassword(password),
    archivedAt: null,
  }

  const result = await db.collection<Profile>(COLLECTION).insertOne(doc as Profile)

  return { _id: result.insertedId, ...doc }
}

export async function getProfiles(db: Db): Promise<Profile[]> {
  return db.collection<Profile>(COLLECTION).find({ archivedAt: null }).toArray()
}

export async function getProfileById(db: Db, id: string): Promise<Profile | null> {
  return db.collection<Profile>(COLLECTION).findOne({ _id: new ObjectId(id) })
}

export async function updateProfile(db: Db, id: string, dto: UpdateProfileDto): Promise<void> {
  await db.collection<Profile>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: stripUndefined(dto) }
  )
}

export async function archiveProfile(db: Db, id: string): Promise<void> {
  await db.collection<Profile>(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { archivedAt: new Date() } }
  )
}