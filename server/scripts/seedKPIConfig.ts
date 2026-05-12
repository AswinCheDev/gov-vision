import dotenv from "dotenv"
dotenv.config()

import { connectMongo } from "../config/db"
import KPIConfig from "../models/KPIConfig"
import { DEFAULT_CONFIGS } from "../routes/kpiConfigRoutes"

async function seed() {
  await connectMongo()
  for (const config of DEFAULT_CONFIGS) {
    await KPIConfig.updateOne(
      { kpiName: config.kpiName },
      { $set: config },
      { upsert: true }
    )
  }
  console.log("KPI config seeded")
  process.exit(0)
}

seed().catch(error => {
  console.error(error)
  process.exit(1)
})