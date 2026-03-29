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

describe("POST /profiles", () => {
  it("створює новий профіль", async () => {
    const res = await app.request("/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "admin", password: "admin123!" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.login).toBe("admin")
    expect(body.id).toBeDefined()
  })

  it("повертає 409 якщо логін вже існує", async () => {
    const payload = JSON.stringify({ login: "admin", password: "admin123!" })
    const headers = { "Content-Type": "application/json" }

    // Спочатку створюємо
    await app.request("/profiles", { method: "POST", headers, body: payload })

    // Потім намагаємось створити знову
    const res = await app.request("/profiles", { method: "POST", headers, body: payload })

    expect(res.status).toBe(409)
  })

  it("повертає 400 якщо логін не валідний", async () => {
    const res = await app.request("/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "a", password: "admin123!" }),
    })

    expect(res.status).toBe(400)
  })
})

describe("GET /profiles", () => {
  it("повертає список профілів", async () => {
    // Спочатку створюємо профіль
    await app.request("/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "admin", password: "admin123!" }),
    })

    const res = await app.request("/profiles")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it("повертає порожній список якщо профілів немає", async () => {
    const res = await app.request("/profiles")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})