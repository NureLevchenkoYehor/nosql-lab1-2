import { Db, ObjectId } from "mongodb";
import { connectDb } from "./db"

const profiles = [
  { _id: new ObjectId(), isDefault: true, name: { first: 'admin', last: 'sys' } },
  { _id: new ObjectId(), isDefault: false, name: { first: 'ivan', last: 'petrov' } },
  { _id: new ObjectId(), isDefault: false, name: { first: 'maria', last: 'kovalenko' } },
  { _id: new ObjectId(), isDefault: false, name: { first: 'sergey', last: 'popov' } },
  { _id: new ObjectId(), isDefault: false, name: { first: 'olga', last: 'ivanova' } },
];

const identites = [
  { profile: profiles[0]._id, login: 'admin', passwordHash: 'hash1', email: 'admin@system.local' },
  { profile: profiles[1]._id, login: 'ivan.petrov', passwordHash: 'hash2', email: 'ivan.petrov@gov.ua' },
  { profile: profiles[2]._id, login: 'maria.kovalenko', passwordHash: 'hash3', email: 'maria.kovalenko@gov.ua' },
  { profile: profiles[3]._id, login: 'sergey.popov', passwordHash: 'hash4', email: 'sergey.popov@azov.ua' },
  { profile: profiles[4]._id, login: 'olga.ivanova', passwordHash: 'hash5', email: 'olga.ivanova@azov.ua' },
];

seed();

async function seed() {
  const db = await connectDb()

  await clearDb(db);

  await db.collection("profiles").insertMany(profiles);
  await db.collection("identities").insertMany(identites);

  console.log("Seeded")
  process.exit(0)
}

async function clearDb(db: Db) {
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).drop();
  }
}