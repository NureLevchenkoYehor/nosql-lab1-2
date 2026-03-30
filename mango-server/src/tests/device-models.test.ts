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
    expect(body.data.length).toBe(1)
    expect(body.total).toBe(1)
  })

  it("повертає порожній список якщо моделей немає", async () => {
    const res = await app.request("/devices/models")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
    expect(body.total).toBe(0)
  })
})

describe("GET /devices/models search", () => {
  it("шукає за назвою", async () => {
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "SoundSensor v1" }),
    })
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "NoiseMeter v1" }),
    })

    const res = await app.request("/devices/models?search=sound")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(1)
    expect(body.total).toBe(1)
    expect(body.data[0].name).toBe("SoundSensor v1")
  })
})

describe("GET /devices/models sorting", () => {
  it("сортує за назвою A-Z", async () => {
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Zebra" }),
    })
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alpha" }),
    })

    const res = await app.request("/devices/models?sortBy=name&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].name).toBe("Alpha")
    expect(body.data[1].name).toBe("Zebra")
    expect(body.total).toBe(2)
  })

  it("сортує за назвою Z-A", async () => {
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alpha" }),
    })
    await app.request("/devices/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Zebra" }),
    })

    const res = await app.request("/devices/models?sortBy=name&sortOrder=desc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].name).toBe("Zebra")
    expect(body.data[1].name).toBe("Alpha")
    expect(body.total).toBe(2)
  })
})

describe("GET /devices/models pagination", () => {
  it("повертає правильну кількість записів через take", async () => {
    for (const name of ["Model A", "Model B", "Model C"]) {
      await app.request("/devices/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    }

    const res = await app.request("/devices/models?take=2")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(2)
    expect(body.total).toBe(3)
  })

  it("пропускає записи через skip", async () => {
    for (const name of ["Model A", "Model B", "Model C"]) {
      await app.request("/devices/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    }

    const res = await app.request("/devices/models?skip=1&take=10&sortBy=name&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.length).toBe(2)
    expect(body.total).toBe(3)
    expect(body.data[0].name).toBe("Model B")
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
    expect(body.data[0].name).toBe("SoundSensor v2")
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
    expect(body.data).toEqual([])
  })

  it("повертає 404 якщо модель не існує", async () => {
    const res = await app.request("/devices/models/000000000000000000000000", {
      method: "DELETE",
    })

    expect(res.status).toBe(404)
  })
})