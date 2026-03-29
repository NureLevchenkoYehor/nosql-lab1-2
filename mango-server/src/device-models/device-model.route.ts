import { Hono } from "hono"
import { getDb } from "../db"
import {
  CreateDeviceModelSchema,
  UpdateDeviceModelSchema,
  toDeviceModelResponse
} from "./device-model.schema"
import {
  createDeviceModel,
  getDeviceModels,
  getDeviceModelById,
  updateDeviceModel,
  archiveDeviceModel
} from "./device-model.repository"

const router = new Hono()

// POST /devices/models
router.post("/", async (c) => {
  const body = await c.req.json()
  const result = CreateDeviceModelSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const doc = await createDeviceModel(db, result.data)

  if (!doc) return c.body(null, 409)

  return c.json(toDeviceModelResponse(doc), 201)
})

// GET /devices/models
router.get("/", async (c) => {
  const db = getDb()
  const docs = await getDeviceModels(db)

  return c.json(docs.map(toDeviceModelResponse), 200)
})

// PATCH /devices/models/:id
router.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()
  const result = UpdateDeviceModelSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const doc = await getDeviceModelById(db, id)

  if (!doc) return c.body(null, 404)

  await updateDeviceModel(db, id, result.data)

  return c.body(null, 204)
})

// DELETE /devices/models/:id
router.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getDeviceModelById(db, id)

  if (!doc) return c.body(null, 404)

  await archiveDeviceModel(db, id)

  return c.body(null, 204)
})

export { router as deviceModelsRouter }