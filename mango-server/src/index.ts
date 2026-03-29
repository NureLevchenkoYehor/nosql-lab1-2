import { app } from "./app"
import { connectDb } from "./db"

connectDb(Bun.env.MONGO_DB!).then(() => {
  Bun.serve({ fetch: app.fetch, port: Number(Bun.env.PORT) || 3000 })
  console.log("Server started on port 3000")
})