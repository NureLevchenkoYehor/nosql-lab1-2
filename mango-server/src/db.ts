import { MongoClient, Db } from "mongodb"

const client = new MongoClient(Bun.env.MONGO_URI!)
let db: Db

export async function connectDb(dbName: string): Promise<Db> {
  await client.connect()
  db = client.db(dbName)
  console.log("MongoDB connected")
  return db
}

export function getDb(): Db {
  if (!db) throw new Error("DB not connected")
  return db
}