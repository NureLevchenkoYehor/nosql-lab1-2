import { connectDb, getDb } from "../db"

process.env.NODE_ENV = "test"

export async function setup(): Promise<void> {
  process.env.NODE_ENV = "test"
  await connectDb(Bun.env.MONGO_TEST_DB!)
}

export async function teardown(): Promise<void> {
  await getDb().dropDatabase()
}

export async function clearCollections(): Promise<void> {
  const db = getDb()
  const collections = await db.listCollections().toArray()
  await Promise.all(collections.map(col => db.collection(col.name).deleteMany({})))
}
