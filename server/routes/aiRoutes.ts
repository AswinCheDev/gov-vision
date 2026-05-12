import { Router, Request, Response } from "express"
import Anomaly from "../models/Anomaly"
import KPI_Snapshot from "../models/KPI_Snapshot"
import { getOrSet, invalidate } from "../services/cacheService"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

// Role-based access configuration
const ROLE_ANOMALY_ACCESS: Record<string, { canView: boolean; canAcknowledge: boolean }> = {
  admin: { canView: true, canAcknowledge: true },
  manager: { canView: true, canAcknowledge: true },
  executive: { canView: false, canAcknowledge: false },
  analyst: { canView: true, canAcknowledge: true }
}

router.get(
  "/anomalies",
  validateJWT,
  requireRole(["admin", "manager", "executive", "analyst"]),
  async (req: Request, res: Response) => {
    try {
      const userRole = req.user?.role || 'analyst'
      const roleAccess = ROLE_ANOMALY_ACCESS[userRole.toLowerCase()] || ROLE_ANOMALY_ACCESS.analyst
      
      // Executives cannot view anomalies
      if (!roleAccess.canView) {
        return res.json({
          Critical: [],
          High: [],
          Medium: [],
          Low: [],
          total: 0,
          note: `${userRole} role: anomalies access denied`
        })
      }

      const cacheKey = "m3:anomalies:active"

      const data = await getOrSet(cacheKey, 300, async () => {
        const anomalies = await Anomaly.find({ isAcknowledged: false })
          .sort({ anomalyScore: -1 })
          .lean()

        const grouped: Record<string, typeof anomalies> = {
          Critical: [],
          High: [],
          Medium: [],
          Low: []
        }

        for (const anomaly of anomalies) {
          if (grouped[anomaly.severity]) {
            grouped[anomaly.severity].push(anomaly)
          }
        }

        return {
          ...grouped,
          total: anomalies.length
        }
      })

      return res.json(data)
    } catch (err: any) {
      console.error("[GET /api/ai/anomalies]", err.message)
      return res.status(500).json({ error: "Failed to fetch anomalies" })
    }
  }
)

router.put(
  "/anomalies/:id/acknowledge",
  validateJWT,
  requireRole(["admin", "manager", "executive", "analyst"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const userId = req.user?.userId

      const updated = await Anomaly.findByIdAndUpdate(
        id,
        {
          $set: {
            isAcknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      )

      if (!updated) {
        return res.status(404).json({ error: "Anomaly not found" })
      }

      await invalidate("m3:anomalies:active")

      return res.json(updated)
    } catch (err: any) {
      console.error("[PUT /api/ai/anomalies/:id/acknowledge]", err.message)
      return res.status(500).json({ error: "Failed to acknowledge anomaly" })
    }
  }
)

router.get(
  "/risk-scores",
  validateJWT,
  requireRole(["admin", "manager", "analyst"]),
  async (req: Request, res: Response) => {
    try {
      const snapshots = await KPI_Snapshot.find({
        source: "ai_workflow",
        departmentId: { $ne: null }
      })
        .sort({ updatedAt: -1 })
        .lean()

      const latestByDept = new Map<string, any>()
      for (const snapshot of snapshots) {
        const deptKey = String(snapshot.departmentId || snapshot.departmentName || "unknown")
        if (!latestByDept.has(deptKey)) {
          latestByDept.set(deptKey, snapshot)
        }
      }

      const payload = Array.from(latestByDept.values()).map((snapshot: any) => ({
        departmentId: snapshot.departmentId || "unknown",
        departmentName: snapshot.departmentName || snapshot.departmentId || "Unknown",
        riskScore: Number(snapshot.riskScore ?? 0),
        riskLevel: snapshot.riskLevel || "low"
      }))

      return res.json(payload)
    } catch (err: any) {
      console.error("[GET /api/ai/risk-scores]", err.message)
      return res.status(500).json({ error: "Failed to fetch risk scores" })
    }
  }
)

router.get(
  "/model-status",
  validateJWT,
  requireRole(["admin", "manager", "analyst"]),
  async (_req: Request, res: Response) => {
    try {
      const latestSnapshot = await KPI_Snapshot.findOne({ source: "ai_workflow" })
        .sort({ updatedAt: -1 })
        .lean()

      const lastTrained = latestSnapshot?.updatedAt
        ? new Date(String(latestSnapshot.updatedAt)).toISOString()
        : new Date().toISOString()

      return res.json([
        { modelName: "Isolation Forest", lastTrained, confidence: null },
        { modelName: "Prophet", lastTrained, confidence: null },
        { modelName: "Random Forest", lastTrained, confidence: null }
      ])
    } catch (err: any) {
      console.error("[GET /api/ai/model-status]", err.message)
      return res.status(500).json({ error: "Failed to fetch model status" })
    }
  }
)

export default router