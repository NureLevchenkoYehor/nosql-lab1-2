import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test"
import { setup, teardown, clearCollections } from "./setup"
import { app } from "../app"

beforeAll(async () => {
  await setup()
})

afterAll(async () => {
  await teardown()
})

beforeEach(async () => {
  await clearCollections()
})

describe("POST /devices/models", () => {
  it("створює нову модель", async () => {
    const res = await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v1" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe("SoundSensor v1")
    expect(body.id).toBeDefined()
  })

  it("повертає 409 якщо модель вже існує", async () => {
    const payload = JSON.stringify({ name: "SoundSensor v1" })
    const headers = { "Content-Type": "application/json" }

    await app.request("/devices/models", { method: "POST", headers, body: payload })
    const res = await app.request("/devices/models", { method: "POST", headers, body: payload })

    expect(res.status).toBe(409)
  })

  it("повертає 400 якщо назва порожня", async () => {
    const res = await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /devices/models", () => {
  it("повертає список моделей", async () => {
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v1" }),
    })

    const res = await app.request("/devices/models")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it("повертає порожній список якщо моделей немає", async () => {
    const res = await app.request("/devices/models")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe("PATCH /devices/models/:id", () => {
  it("оновлює назву моделі", async () => {
    const created = await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v1" }),
    })
    const { id } = await created.json()

    const res = await app.request(`/devices/models/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v2" }),
    })

    expect(res.status).toBe(204)

    const list = await app.request("/devices/models")
    const body = await list.json()
    expect(body[0].name).toBe("SoundSensor v2")
  })

  it("повертає 404 якщо модель не існує", async () => {
    const res = await app.request("/devices/models/000000000000000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v2" }),
    })

    expect(res.status).toBe(404)
  })
})

describe("DELETE /devices/models/:id", () => {
  it("архівує модель", async () => {
    const created = await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v1" }),
    })
    const { id } = await created.json()

    const res = await app.request(`/devices/models/${id}`, {
      method: "DELETE",
    })

    expect(res.status).toBe(204)

    const list = await app.request("/devices/models")
    const body = await list.json()
    expect(body).toEqual([])
  })

  it("повертає 404 якщо модель не існує", async () => {
    const res = await app.request("/devices/models/000000000000000000000000", {
      method: "DELETE",
    })

    expect(res.status).toBe(404)
  })
})