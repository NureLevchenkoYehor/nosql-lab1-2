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
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    expect(body.total).toBeGreaterThan(0)
  })

  it("повертає порожній список якщо профілів немає", async () => {
    const res = await app.request("/profiles")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe("GET /profiles search", () => {
  it("шукає за ім'ям", async () => {
    await createProfile("ivan", "Іван", "Петренко")
    await createProfile("petro", "Петро", "Сидоренко")

    const res = await app.request("/profiles?search=іван")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(1)
    expect(body.data[0].login).toBe("ivan")
  })

  it("шукає за прізвищем", async () => {
    await createProfile("ivan", "Іван", "Петренко")
    await createProfile("petro", "Петро", "Сидоренко")

    const res = await app.request("/profiles?search=петренко")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(1)
    expect(body.data[0].login).toBe("ivan")
  })

  it("шукає за логіном", async () => {
    await createProfile("ivan")
    await createProfile("petro")

    const res = await app.request("/profiles?login=ivan")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(1)
    expect(body.data[0].login).toBe("ivan")
  })
})

describe("GET /profiles sorting", () => {
  it("сортує за логіном A-Z", async () => {
    await createProfile("zebra")
    await createProfile("alpha")

    const res = await app.request("/profiles?sortBy=login&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].login).toBe("alpha")
    expect(body.data[1].login).toBe("zebra")
  })

  it("сортує за логіном Z-A", async () => {
    await createProfile("alpha")
    await createProfile("zebra")

    const res = await app.request("/profiles?sortBy=login&sortOrder=desc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].login).toBe("zebra")
    expect(body.data[1].login).toBe("alpha")
  })
})

describe("GET /profiles pagination", () => {
  it("повертає правильну кількість записів через take", async () => {
    await createProfile("user1")
    await createProfile("user2")
    await createProfile("user3")

    const res = await app.request("/profiles?take=2")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(2)
    expect(body.total).toBe(3)
  })

  it("пропускає записи через skip", async () => {
    await createProfile("user1")
    await createProfile("user2")
    await createProfile("user3")

    const res = await app.request("/profiles?skip=1&take=10&sortBy=login&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].login).toBe("user2")
  })
})


async function createProfile(login: string, name?: string, surname?: string) {
  const res = await app.request("/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password: "admin123!", name, surname }),
  })
  return res.json()
}