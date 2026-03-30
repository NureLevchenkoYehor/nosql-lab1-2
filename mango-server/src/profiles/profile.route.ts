import { Hono } from "hono"
import { getDb } from "../db"
import {
  CreateProfileSchema,
  GetProfilesQuerySchema,
  UpdateProfileSchema,
  toProfileResponse
} from "./profile.schema"
import {
  createProfile,
  getProfiles,
  getProfileById,
  updateProfile,
  archiveProfile
} from "./profile.repository"

const router = new Hono()

// POST /profiles
router.post("/", async (c) => {
  const body = await c.req.json()
  const result = CreateProfileSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const doc = await createProfile(db, result.data)

  if (!doc) return c.body(null, 409)

  return c.json(toProfileResponse(doc), 201)
})

// GET /profiles
router.get("/", async (c) => {
  const query = c.req.query()
  const result = GetProfilesQuerySchema.safeParse(query)

  if (!result.success) return c.json(result.error, 400)

  const db = getDb()
  const paginated = await getProfiles(db, result.data)

  return c.json({
    ...paginated,
    data: paginated.data.map(toProfileResponse),
  }, 200)
})

// GET /profiles/:id
router.get("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getProfileById(db, id)

  if (!doc) return c.body(null, 404)

  return c.json(toProfileResponse(doc), 200)
})

// PATCH /profiles/:id
router.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getProfileById(db, id)

  if (!doc) return c.body(null, 404)

  const body = await c.req.json()
  const result = UpdateProfileSchema.safeParse(body)

  if (!result.success) return c.json(result.error, 400)

  await updateProfile(db, id, result.data)

  return c.body(null, 204)
})

// DELETE /profiles/:id
router.delete("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDb()
  const doc = await getProfileById(db, id)

  if (!doc) return c.body(null, 404)

  await archiveProfile(db, id)

  return c.body(null, 204)
})

export { router as profilesRouter }