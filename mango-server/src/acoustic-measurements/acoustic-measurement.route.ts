import { Hono } from "hono"
import { getDb } from "../db"
import {
  GetAcousticMeasurementsQuerySchema,
  toAcousticMeasurementResponse,
} from "./acoustic-measurement.schema"
import {
  getAcousticMeasurements,
} from "./acoustic-measurement.repository"

const router = new Hono()

// GET /devices/acoustic-measurements
router.get("/", async (c) => {
  const query = c.req.query()
  const result = GetAcousticMeasurementsQuerySchema.safeParse(query)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const docs = await getAcousticMeasurements(db, result.data)

  return c.json(docs.map(toAcousticMeasurementResponse), 200)
})

export { router as acousticMeasurementsRouter }