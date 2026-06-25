import { Request } from "express"
import KPISnapshot from "../models/KPI_Snapshot"
import Anomaly from "../models/Anomaly"

export interface ReportData {
  kpiRows: KPIRow[]
  anomalyRows: AnomalyRow[]
  generatedAt: string
  dateFrom: string
  dateTo: string
  departments: string[]
}

export interface KPIRow {
  deptId: string
  dept: string
  approvalRate: number
  avgCycleTime: number
  riskLevel: string
  complianceRate: number
  totalDecisions: number
  anomalyCount: number
}

const DEPT_NAME_MAP: Record<string, string> = {
  FI001: "Finance",
  IT004: "Information Technology",
  OP003: "Operations",
  HR002: "Human Resources",
  CS005: "Customer Service",
  Finance: "Finance",
  "Information Technology": "Information Technology",
  Operations: "Operations",
  "Human Resources": "Human Resources",
  "Customer Service": "Customer Service",
  ORG: "Organisation",
}

export interface AnomalyRow {
  decisionId: string
  severity: string
  anomalyScore: string
  department: string
  isAcknowledged: string
  description: string
}

type AnomalyDoc = {
  decisionId?: unknown
  severity?: unknown
  anomalyScore?: unknown
  department?: unknown
  isAcknowledged?: unknown
  description?: unknown
}

function titleCaseRisk(value: unknown): string {
  const normalized = String(value || "low").toLowerCase()
  if (normalized === "critical") return "Critical"
  if (normalized === "high") return "High"
  if (normalized === "medium") return "Medium"
  return "Low"
}

export async function assembleReportData(config: {
  dateFrom: string
  dateTo: string
  departments: string[]
}): Promise<ReportData> {
  const dateFilter: Record<string, Date> = {}
  if (config.dateFrom) dateFilter.$gte = new Date(config.dateFrom)
  if (config.dateTo) dateFilter.$lte = new Date(config.dateTo)

  const matchFilter: Record<string, unknown> = {}
  if (Object.keys(dateFilter).length > 0) matchFilter.snapshotDate = dateFilter
  if (config.departments.length > 0) {
    matchFilter.departmentId = { $in: config.departments }
  }

  const snapshots = await KPISnapshot.find(matchFilter)
    .sort({ snapshotDate: -1 })
    .lean() as Array<Record<string, unknown>>

  const byDept = new Map<string, Record<string, unknown>>()
  for (const snap of snapshots) {
    const deptId = String(snap.departmentId || "")
    if (!deptId) continue
    if (!byDept.has(deptId)) {
      byDept.set(deptId, snap)
    }
  }

  const kpiRowsRaw: KPIRow[] = Array.from(byDept.values()).map((snap) => {
    const totalDecisions = Number(snap.totalDecisions || 0)
    const approvedCount = Number(snap.approvedCount || 0)
    const approvalRate = totalDecisions > 0 ? (approvedCount / totalDecisions) * 100 : 0
    const rawId = String(snap.departmentId || "unknown")
    const deptName = DEPT_NAME_MAP[rawId] || rawId

    return {
      deptId: rawId,
      dept: deptName,
      approvalRate: Number(approvalRate.toFixed(2)),
      avgCycleTime: Number(snap.avgCycleTimeHours || 0),
      riskLevel: titleCaseRisk(snap.riskLevel),
      complianceRate: Number(snap.complianceRate ?? 100),
      totalDecisions,
      anomalyCount: Number(snap.anomalyCount || 0),
    }
  })

  // Deduplicate by department name — keep the row with actual data (higher totalDecisions)
  const dedupedByName = new Map<string, KPIRow>()
  for (const row of kpiRowsRaw) {
    const existing = dedupedByName.get(row.dept)
    if (!existing || row.totalDecisions > existing.totalDecisions) {
      dedupedByName.set(row.dept, row)
    }
  }
  const kpiRows: KPIRow[] = Array.from(dedupedByName.values())


  const anomalyFilter: Record<string, unknown> = {}
  if (config.departments.length > 0) {
    anomalyFilter.department = { $in: config.departments }
  }
  // Add date filtering for anomalies (createdAt within range)
  if (config.dateFrom || config.dateTo) {
    anomalyFilter.createdAt = {}
    if (config.dateFrom) anomalyFilter.createdAt.$gte = new Date(config.dateFrom)
    if (config.dateTo) anomalyFilter.createdAt.$lte = new Date(config.dateTo)
  }

  const anomalies = await Anomaly.find(anomalyFilter)
    .sort({ anomalyScore: -1 })
    .lean()
    .exec() as AnomalyDoc[]

  const anomalyRows: AnomalyRow[] = anomalies.map((a) => ({
    decisionId: String(a.decisionId || ""),
    severity: String(a.severity || "Normal"),
    anomalyScore: Number(a.anomalyScore || 0).toFixed(3),
    department: String(a.department || "unknown"),
    isAcknowledged: a.isAcknowledged ? "Yes" : "No",
    description: String(a.description || ""),
  }))

  return {
    kpiRows,
    anomalyRows,
    generatedAt: new Date().toISOString(),
    dateFrom: config.dateFrom,
    dateTo: config.dateTo,
    departments: config.departments,
  }
}

export function getAppBaseUrl(req?: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL
  if (req) return `${req.protocol}://${req.get("host")}`
  return "http://localhost:5002"
}
