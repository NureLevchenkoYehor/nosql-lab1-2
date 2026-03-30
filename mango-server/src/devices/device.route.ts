import { Hono } from "hono"
import { getDb } from "../db"
import {
  CreateDeviceSchema,
  UpdateDeviceSchema,
  UpdateDeviceStateSchema,
  toDeviceResponse,
  DeviceCreatedResponseDto,
  GetDevicesQuerySchema,
} from "./device.schema"
import {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  updateDeviceState,
  updateDeviceApiKey,
  archiveDevice,
  updateDeviceLastSeen,
  getDeviceByApiKeyHash,
} from "./device.repository"
import { generateApiKey, hashApiKey } from "../common/crypto"
import { getDeviceModelById } from "../device-models/device-model.repository"
import { CreateLocationSchema } from "../locations/location.schema"
import { createLocation, getLastLocation } from "../locations/location.repository"
import { CreateAcousticMeasurementSchema, toAcousticMeasurementResponse } from "../acoustic-measurements/acoustic-measurement.schema"
import { createAcousticMeasurement } from "../acoustic-measurements/acoustic-measurement.repository"

const router = new Hono()

// POST /devices
router.post("/", async (c) => {
  const body = await c.req.json()
  const result = CreateDeviceSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const modelExists = await getDeviceModelById(db, result.data.modelId)

  if (!modelExists) return c.body(null, 404)

  const apiKey = generateApiKey()
  const apiKeyHash = hashApiKey(apiKey)

  const doc = await createDevice(db, result.data, apiKeyHash)
  if (!doc) return c.body(null, 409)

  const response: DeviceCreatedResponseDto = {
    ...toDeviceResponse(doc),
    apiKey,
  }

  return c.json(response, 201)
})

// GET /devices
router.get("/", async (c) => {
  const query = c.req.query()
  const result = GetDevicesQuerySchema.safeParse(query)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const paginated = await getDevices(db, result.data)

  return c.json({
    ...paginated,
    data: paginated.data.map(toDeviceResponse),
  }, 200)
})

// GET /devices/:id
router.get("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  return c.json(toDeviceResponse(doc), 200)
})

// PATCH /devices/:id
router.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  const body = await c.req.json()
  const result = UpdateDeviceSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  await updateDevice(db, id, result.data)

  return c.body(null, 204)
})

// DELETE /devices/:id
router.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  await archiveDevice(db, id)

  return c.body(null, 204)
})

// POST /devices/:id/rotate
router.post("/:id/rotate", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  const apiKey = generateApiKey()
  const apiKeyHash = hashApiKey(apiKey)

  await updateDeviceApiKey(db, id, apiKeyHash)

  return c.json({ apiKey }, 200)
})

// POST /devices/:id/state
router.post("/:id/state", async (c) => {
  const apiKey = c.req.header("X-Api-Key")
  if (!apiKey) return c.body(null, 401)

  const id = c.req.param("id")

  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  if (hashApiKey(apiKey) !== doc.apiKeyHash) return c.body(null, 401)

  const body = await c.req.json()
  const result = UpdateDeviceStateSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  await updateDeviceState(db, id, result.data)

  return c.body(null, 204)
})

// POST /devices/:id/location
router.post("/:id/location", async (c) => {
  const apiKey = c.req.header("X-Api-Key")
  if (!apiKey) return c.body(null, 401)

  const id = c.req.param("id")

  const db = getDb()
  const doc = await getDeviceById(db, id)

  if (!doc) return c.body(null, 404)

  if (hashApiKey(apiKey) !== doc.apiKeyHash) return c.body(null, 401)

  const body = await c.req.json()
  const result = CreateLocationSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  await createLocation(db, id, result.data)
  await updateDeviceLastSeen(db, id)

  return c.body(null, 204)
})

// POST /devices/:id/acoustic-measurements
router.post("/:id/acoustic-measurements", async (c) => {
  const apiKey = c.req.header("X-Api-Key")
  if (!apiKey) return c.body(null, 401)

  const body = await c.req.json()
  const result = CreateAcousticMeasurementSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()

  const apiKeyHash = hashApiKey(apiKey)
  const device = await getDeviceByApiKeyHash(db, apiKeyHash)
  if (!device) return c.body(null, 401)

  const deviceId = device._id.toString()

  const location = await getLastLocation(db, deviceId)
  if (!location) return c.body(null, 422)

  const doc = await createAcousticMeasurement(db, deviceId, location._id.toString(), result.data)
  await updateDeviceLastSeen(db, deviceId)

  return c.json(toAcousticMeasurementResponse({
    ...doc,
    ...location
  }), 201)
})

export { router as devicesRouter }