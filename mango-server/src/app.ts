import { Hono } from "hono"
import { profilesRouter } from "./profiles/profile.route"
import { deviceModelsRouter } from "./device-models/device-model.route"
import { devicesRouter } from "./devices/device.route"
import { acousticMeasurementsRouter } from "./acoustic-measurements/acoustic-measurement.route"

export const app = new Hono()

app.route("/profiles", profilesRouter)
app.route("/devices/models", deviceModelsRouter)
app.route("/devices", devicesRouter)
app.route("/acoustic-measurements", acousticMeasurementsRouter)