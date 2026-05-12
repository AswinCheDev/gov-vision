import { Router, Request, Response } from "express"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"
import KPIConfig from "../models/KPIConfig"

const router = Router()

const DEFAULT_CONFIGS = [
  { kpiName: "Total Decisions", targetValue: 500, warningThresholdPct: 80, criticalThresholdPct: 60 },
  { kpiName: "Approval Rate", targetValue: 85, warningThresholdPct: 80, criticalThresholdPct: 70 },
  { kpiName: "Rejection Rate", targetValue: 15, warningThresholdPct: 20, criticalThresholdPct: 30 },
  { kpiName: "Avg Approval Time", targetValue: 24, warningThresholdPct: 200, criticalThresholdPct: 300 },
  { kpiName: "Bottleneck Rate", targetValue: 5, warningThresholdPct: 200, criticalThresholdPct: 400 },
  { kpiName: "Compliance Rate", targetValue: 95, warningThresholdPct: 85, criticalThresholdPct: 75 },
  { kpiName: "Violation Count", targetValue: 0, warningThresholdPct: 10, criticalThresholdPct: 25 },
  { kpiName: "Decision Throughput", targetValue: 50, warningThresholdPct: 60, criticalThresholdPct: 30 },
  { kpiName: "Anomaly Count", targetValue: 0, warningThresholdPct: 5, criticalThresholdPct: 10 },
  { kpiName: "AI Risk Score", targetValue: 20, warningThresholdPct: 50, criticalThresholdPct: 75 }
]

router.get(
  "/kpi-config",
  validateJWT,
  requireRole(["admin"]),
  async (_req: Request, res: Response) => {
    const configs = await KPIConfig.find().sort({ kpiName: 1 }).lean()
    return res.json(configs)
  }
)

router.put(
  "/kpi-config",
  validateJWT,
  requireRole(["admin"]),
  async (req: Request, res: Response) => {
    const configs = Array.isArray(req.body) ? req.body : []
    for (const config of configs) {
      if (!config?.kpiName) continue
      await KPIConfig.updateOne(
        { kpiName: config.kpiName },
        {
          $set: {
            targetValue: Number(config.targetValue),
            warningThresholdPct: Number(config.warningThresholdPct),
            criticalThresholdPct: Number(config.criticalThresholdPct)
          },
          $setOnInsert: {
            defaultTargetValue: Number(config.targetValue)
          }
        },
        { upsert: true }
      )
    }

    const saved = await KPIConfig.find().sort({ kpiName: 1 }).lean()
    return res.json(saved)
  }
)

router.post(
  "/kpi-config/reset",
  validateJWT,
  requireRole(["admin"]),
  async (_req: Request, res: Response) => {
    for (const config of DEFAULT_CONFIGS) {
      await KPIConfig.updateOne(
        { kpiName: config.kpiName },
        { $set: config },
        { upsert: true }
      )
    }

    const saved = await KPIConfig.find().sort({ kpiName: 1 }).lean()
    return res.json(saved)
  }
)

export { DEFAULT_CONFIGS }

export default router