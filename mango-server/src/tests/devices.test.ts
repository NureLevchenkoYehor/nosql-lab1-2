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

describe("POST /devices", () => {
  it("створює новий пристрій", async () => {
    const model = await createModel()

    const res = await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-001" }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.apiKey).toBeDefined()
    expect(body.status).toBe("in_stock")
  })

  it("повертає 409 якщо серійний номер вже існує", async () => {
    const model = await createModel()
    const payload = JSON.stringify({ modelId: model.id, serialNumber: "SN-001" })
    const headers = { "Content-Type": "application/json" }

    await app.request("/devices", { method: "POST", headers, body: payload })
    const res = await app.request("/devices", { method: "POST", headers, body: payload })

    expect(res.status).toBe(409)
  })

  it("повертає 404 якщо модель не існує", async () => {
    const res = await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: "000000000000000000000000", serialNumber: "SN-001" }),
    })

    expect(res.status).toBe(404)
  })
})

describe("GET /devices", () => {
  it("повертає список пристроїв", async () => {
    const model = await createModel()
    await createDevice(model.id)

    const res = await app.request("/devices")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
  })

  it("повертає порожній список якщо пристроїв немає", async () => {
    const res = await app.request("/devices")

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })
})

describe("GET /devices filtering", () => {
  it("фільтрує за статусом", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    await app.request(`/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deployed" }),
    })

    const res = await app.request("/devices?status=deployed")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].status).toBe("deployed")
  })

  it("фільтрує за моделлю", async () => {
    const model1 = await createModel()
    const model2 = await (async () => {
      const res = await app.request("/devices/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "SoundSensor v2" }),
      })
      return res.json()
    })()

    await createDevice(model1.id)
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model2.id, serialNumber: "SN-002" }),
    })

    const res = await app.request(`/devices?modelId=${model1.id}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].modelId).toBe(model1.id)
  })

  it("фільтрує неактивні пристрої", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    // Пристрій без lastSeenAt вважається неактивним
    const res = await app.request("/devices?active=false")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === device.id)).toBe(true)
  })

  it("не повертає неактивні пристрої при active=true", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request("/devices?active=true")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.some((d: { id: string }) => d.id === device.id)).toBe(false)
  })
})

describe("GET /devices search", () => {
  it("шукає за серійним номером", async () => {
    const model = await createModel()
    await createDevice(model.id)
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "XZ-999" }),
    })

    const res = await app.request("/devices?serial=SN")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].serialNumber).toBe("SN-001")
  })

  it("шукає за користувацькою назвою", async () => {
    const model = await createModel()
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-001", customName: "Центр міста" }),
    })
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-002", customName: "Парк" }),
    })

    const res = await app.request("/devices?name=центр")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].customName).toBe("Центр міста")
  })
})

describe("GET /devices sorting", () => {
  it("сортує за серійним номером A-Z", async () => {
    const model = await createModel()
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-002" }),
    })
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-001" }),
    })

    const res = await app.request("/devices?sortBy=serialNumber&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].serialNumber).toBe("SN-001")
    expect(body[1].serialNumber).toBe("SN-002")
  })

  it("сортує за серійним номером Z-A", async () => {
    const model = await createModel()
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-001" }),
    })
    await app.request("/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId: model.id, serialNumber: "SN-002" }),
    })

    const res = await app.request("/devices?sortBy=serialNumber&sortOrder=desc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].serialNumber).toBe("SN-002")
    expect(body[1].serialNumber).toBe("SN-001")
  })
})

describe("GET /devices pagination", () => {
  it("повертає правильну кількість записів через take", async () => {
    const model = await createModel()
    for (const sn of ["SN-001", "SN-002", "SN-003"]) {
      await app.request("/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id, serialNumber: sn }),
      })
    }

    const res = await app.request("/devices?take=2")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(2)
  })

  it("пропускає записи через skip", async () => {
    const model = await createModel()
    for (const sn of ["SN-001", "SN-002", "SN-003"]) {
      await app.request("/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id, serialNumber: sn }),
      })
    }

    const res = await app.request("/devices?skip=1&take=10&sortBy=serialNumber&sortOrder=asc")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].serialNumber).toBe("SN-002")
  })
})

describe("PATCH /devices/:id", () => {
  it("оновлює статус пристрою", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deployed" }),
    })

    expect(res.status).toBe(204)

    const updated = await app.request(`/devices/${device.id}`)
    const body = await updated.json()
    expect(body.status).toBe("deployed")
  })

  it("повертає 404 якщо пристрій не існує", async () => {
    const res = await app.request("/devices/000000000000000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "deployed" }),
    })

    expect(res.status).toBe(404)
  })
})

describe("DELETE /devices/:id", () => {
  it("архівує пристрій", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}`, {
      method: "DELETE",
    })

    expect(res.status).toBe(204)

    const list = await app.request("/devices")
    const body = await list.json()
    expect(body).toEqual([])
  })

  it("повертає 404 якщо пристрій не існує", async () => {
    const res = await app.request("/devices/000000000000000000000000", {
      method: "DELETE",
    })

    expect(res.status).toBe(404)
  })
})

describe("POST /devices/:id/rotate", () => {
  it("повертає новий API ключ", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/rotate`, {
      method: "POST",
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.apiKey).toBeDefined()
    expect(body.apiKey).not.toBe(device.apiKey)
  })
})

describe("POST /devices/:id/state", () => {
  it("оновлює стан батареї", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": device.apiKey,
      },
      body: JSON.stringify({ batteryLevel: 85, recordedAt: new Date().toISOString() }),
    })

    expect(res.status).toBe(204)

    const updated = await app.request(`/devices/${device.id}`)
    const body = await updated.json()
    expect(body.batteryLevel).toBe(85)
  })

  it("повертає 401 якщо API ключ невірний", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "wrongkey",
      },
      body: JSON.stringify({ batteryLevel: 85, recordedAt: new Date().toISOString() }),
    })

    expect(res.status).toBe(401)
  })
})

describe("POST /devices/:id/location", () => {
  it("створює новий запис локації", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": device.apiKey,
      },
      body: JSON.stringify({
        longitude: 32.05,
        latitude: 49.44,
        recordedAt: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(204)
  })

  it("повертає 401 якщо API ключ невірний", async () => {
    const model = await createModel()
    const device = await createDevice(model.id)

    const res = await app.request(`/devices/${device.id}/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "wrongkey",
      },
      body: JSON.stringify({
        longitude: 32.05,
        latitude: 49.44,
        recordedAt: new Date().toISOString(),
      }),
    })

    expect(res.status).toBe(401)
  })
})