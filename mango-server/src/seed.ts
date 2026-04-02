import { connectDb } from "./db"
import { hashPassword, generateApiKey, hashApiKey } from "./common/crypto"
import { Db, ObjectId } from "mongodb"



async function seed() {
  const db = await connectDb(Bun.env.MONGO_DB!)

  await clearDb(db);

  const profiles = await db.collection("profiles").insertMany([
    { login: "admin", passwordHash: await hashPassword("admin123!"), archivedAt: null },
    { login: "ivan", passwordHash: await hashPassword("admin123!"), name: "Іван", surname: "Петренко", email: "ivan@gmail.com", archivedAt: null },
    { login: "olena", passwordHash: await hashPassword("admin123!"), name: "Олена", surname: "Коваль", phone: "+380991234567", archivedAt: null },
    { login: "petro", passwordHash: await hashPassword("admin123!"), name: "Петро", surname: "Сидоренко", email: "petro@gmail.com", archivedAt: null },
    { login: "maria", passwordHash: await hashPassword("admin123!"), name: "Марія", surname: "Бондаренко", email: "maria@gmail.com", phone: "+380507654321", archivedAt: null },
  ])
  console.log("Profiles seeded:", profiles.insertedCount)

  const models = await db.collection("device-models").insertMany([
    { name: "SoundSensor v1", archivedAt: null },
    { name: "SoundSensor v2", archivedAt: null },
    { name: "NoiseMeter Pro", archivedAt: null },
  ])
  console.log("Models seeded:", models.insertedCount)

  const modelIds = Object.values(models.insertedIds)

  // Пристрої
  const deviceData = [
    { serialNumber: "SN-001", modelId: modelIds[0], customName: "Центр міста" },
    { serialNumber: "SN-002", modelId: modelIds[0], customName: "Парк Шевченка" },
    { serialNumber: "SN-003", modelId: modelIds[1], customName: "Вокзал" },
    { serialNumber: "SN-004", modelId: modelIds[1], customName: "Площа Героїв" },
    { serialNumber: "SN-005", modelId: modelIds[2], customName: "Набережна" },
  ]

  const apiKeys: string[] = []
  const deviceDocs = await Promise.all(deviceData.map(async d => {
    const apiKey = generateApiKey()
    apiKeys.push(apiKey)
    return {
      ...d,
      apiKeyHash: hashApiKey(apiKey),
      status: "deployed",
      batteryLevel: Math.floor(Math.random() * 100),
      lastSeenAt: new Date(),
      archivedAt: null,
    }
  }))
  const devices = await db.collection("devices").insertMany(deviceDocs)
  console.log("Devices seeded:", devices.insertedCount)

  const deviceIds = Object.values(devices.insertedIds)

  // Локації — по одній на пристрій (Черкаси)
  const baseCoords = [
    { longitude: 32.0598, latitude: 49.4444 },
    { longitude: 32.0621, latitude: 49.4467 },
    { longitude: 32.0554, latitude: 49.4389 },
    { longitude: 32.0677, latitude: 49.4501 },
    { longitude: 32.0512, latitude: 49.4423 },
  ]

  const locationDocs = baseCoords.map((coords, i) => ({
    deviceId: deviceIds[i],
    ...coords,
    recordedAt: new Date(),
  }))

  const locations = await db.collection("locations").insertMany(locationDocs)
  console.log("Locations seeded:", locations.insertedCount)

  const locationIds = Object.values(locations.insertedIds)

  // Виміри — по 2 на перші 5 пристроїв
  const measurementDocs = Array.from({ length: 10 }, (_, i) => ({
    deviceId: deviceIds[i % 5],
    locationId: locationIds[i % 5],
    maxDba: 60 + Math.floor(Math.random() * 40),
    avgDba: 45 + Math.floor(Math.random() * 30),
    intervalS: 60,
    measuredAt: new Date(Date.now() - i * 3600000),
  }))

  const measurements = await db.collection("acoustic-measurements").insertMany(measurementDocs)
  console.log("Measurements seeded:", measurements.insertedCount)

  console.log("\nAPI keys for devices:")
  deviceIds.forEach((id, i) => {
    console.log(`${deviceDocs[i].serialNumber} (${deviceDocs[i].customName}): ${apiKeys[i]}`)
  })

  process.exit(0)
}

async function clearDb(db: Db) {
  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).drop();
  }
  console.log("DB cleared")
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})