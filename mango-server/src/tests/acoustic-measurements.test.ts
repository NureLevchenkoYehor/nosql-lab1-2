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

async function createModel() {
  const res = await app.request("/devices/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "SoundSensor v1" }),
  })
  return res.json()
}

async function createDevice(modelId: string) {
  const res = await app.request("/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelId, serialNumber: "SN-001" }),
  })
  return res.json()
}

async function createLocation(deviceId: string, apiKey: string) {
  await app.request(`/devices/${deviceId}/location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      longitude: 32.05,
      latitude: 49.44,
      recordedAt: new Date().toISOString(),
    }),
  })
}

describe("POST /devices/:id/acoustic-measurements", () => {
  it("створює новий вимір", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)
    await createLocation(device.id, device.apiKey)

    const res = await app.request(`/devices/${device.id}/acoustic-measurements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": device.apiKey,
      },
      body: JSON.stringify({
        maxDba: 80,
        avgDba: 65,
        intervalS: 60,
        measuredAt: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.location.longitude).toBe(32.05)
    expect(body.location.latitude).toBe(49.44)
    expect(body.maxDba).toBe(80)
  })

  it("повертає 401 якщо API ключ невірний", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)
    await createLocation(device.id, device.apiKey)

    const res = await app.request(`/devices/${device.id}/acoustic-measurements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "wrongkey",
      },
      body: JSON.stringify({
        maxDba: 80,
        avgDba: 65,
        intervalS: 60,
        measuredAt: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(401)
  })

  it("повертає 422 якщо пристрій не має локації", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/acoustic-measurements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": device.apiKey,
      },
      body: JSON.stringify({
        maxDba: 80,
        avgDba: 65,
        intervalS: 60,
        measuredAt: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(422)
  })
})

describe("GET /acoustic-measurements", () => {
  it("повертає виміри у заданій області", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)
    await createLocation(device.id, device.apiKey)

    await app.request(`/devices/${device.id}/acoustic-measurements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": device.apiKey,
      },
      body: JSON.stringify({
        maxDba: 80,
        avgDba: 65,
        intervalS: 60,
        measuredAt: new Date().toISOString(),
      }),
    })

    const res = await app.request(
      "/acoustic-measurements?longitude=32.05&latitude=49.44&radius=1"
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].location.longitude).toBe(32.05)
  })

  it("повертає порожній список якщо немає вимірів у області", async () => {
    const res = await app.request(
      "/acoustic-measurements?longitude=0&latitude=0&radius=1"
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it("повертає 400 якщо параметри не передані", async () => {
    const res = await app.request("/acoustic-measurements")

    expect(res.status).toBe(400)
  })
})