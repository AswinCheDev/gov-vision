import { useEffect, useMemo, useState } from "react"
import { getKpiConfig, getKpiSummary, resetKpiConfig, saveKpiConfig } from "../services/api"
import type { IKpiSummary } from "../types"
import SkeletonLoader from "../components/SkeletonLoader"

type ConfigRow = {
  kpiName: string
  targetValue: number
  warningThresholdPct: number
  criticalThresholdPct: number
  defaultTargetValue: number
}

const KPI_DEFINITIONS = [
  { kpiName: "Total Decisions", live: (summary: IKpiSummary) => Number(summary.totalDecisions ?? 0) },
  { kpiName: "Approval Rate", live: (summary: IKpiSummary) => Number(((summary.approvedCount / Math.max(summary.totalDecisions, 1)) * 100).toFixed(2)) },
  { kpiName: "Rejection Rate", live: (summary: IKpiSummary) => Number(((summary.rejectedCount / Math.max(summary.totalDecisions, 1)) * 100).toFixed(2)) },
  { kpiName: "Avg Approval Time", live: (summary: IKpiSummary) => Number((summary.avgCycleTimeHours ?? 0).toFixed(2)) },
  { kpiName: "Bottleneck Rate", live: (summary: IKpiSummary) => Number(((summary as any).bottleneckRate ?? 0).toFixed(2)) },
  { kpiName: "Compliance Rate", live: (summary: IKpiSummary) => Number((summary.complianceRate ?? 0).toFixed(2)) },
  { kpiName: "Violation Count", live: (summary: IKpiSummary) => Number(summary.violationCount ?? 0) },
  { kpiName: "Decision Throughput", live: (summary: IKpiSummary) => Math.round((summary.totalDecisions ?? 0) / 30) },
  { kpiName: "Anomaly Count", live: (summary: IKpiSummary) => Number(summary.anomalyCount ?? 0) },
  { kpiName: "AI Risk Score", live: (summary: IKpiSummary) => riskValue(summary) }
]

function riskValue(summary: IKpiSummary): number {
  const riskLevel = String((summary as any).riskLevel ?? "Low").toLowerCase()
  if (riskLevel === "critical") return 100
  if (riskLevel === "high") return 75
  if (riskLevel === "medium") return 50
  return 25
}

export default function KPIConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configRows, setConfigRows] = useState<ConfigRow[]>([])
  const [liveValues, setLiveValues] = useState<Record<string, number>>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [configs, summary] = await Promise.all([
          getKpiConfig(),
          getKpiSummary({ dateFrom: "2024-01-01", dateTo: new Date().toISOString().split("T")[0], deptId: null })
        ])

        if (cancelled) return
        setConfigRows(configs)
        setLiveValues(Object.fromEntries(KPI_DEFINITIONS.map(def => [def.kpiName, def.live(summary)])))
      } catch (error) {
        console.error("KPIConfig load error:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const mergedRows = useMemo(() => {
    const map = new Map(configRows.map(row => [row.kpiName, row]))
    return KPI_DEFINITIONS.map(def => {
      const existing = map.get(def.kpiName)
      return {
        kpiName: def.kpiName,
        liveValue: liveValues[def.kpiName] ?? 0,
        targetValue: existing?.targetValue ?? 0,
        warningThresholdPct: existing?.warningThresholdPct ?? 0,
        criticalThresholdPct: existing?.criticalThresholdPct ?? 0,
        defaultTargetValue: existing?.defaultTargetValue ?? 0
      }
    })
  }, [configRows, liveValues])

  const updateRow = (kpiName: string, field: keyof ConfigRow, value: number) => {
    setConfigRows(prev => prev.map(row => row.kpiName === kpiName ? { ...row, [field]: value } : row))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await saveKpiConfig(configRows)
      setMessage("Saved KPI configuration.")
    } catch (error) {
      console.error("Failed to save KPI config:", error)
      setMessage("Failed to save KPI configuration.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const rows = await resetKpiConfig()
      setConfigRows(rows as ConfigRow[])
      setMessage("Reset KPI configuration to defaults.")
    } catch (error) {
      console.error("Failed to reset KPI config:", error)
      setMessage("Failed to reset KPI configuration.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 24, background: "#F5F6FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Outfit', sans-serif" }}>
            <span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
            <span>Admin</span><span style={{ color: "#CBD5E1" }}>›</span>
            <span style={{ color: "#374151", fontWeight: 600 }}>KPI Config</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#0F172A" }}>KPI Config</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>Adjust target and threshold values for the dashboard KPI cards.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={handleSave} disabled={saving} style={primaryButtonStyle}>Save All Changes</button>
          <button type="button" onClick={handleReset} disabled={saving} style={secondaryButtonStyle}>Reset to Defaults</button>
        </div>
      </div>

      {message && <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 12, background: "white", border: "1px solid #E2E8F0", color: "#334155", fontSize: 13 }}>{message}</div>}

      {loading ? (
        <SkeletonLoader />
      ) : (
        <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748B", fontSize: 12 }}>
                <th style={thStyle}>KPI Name</th>
                <th style={thStyle}>Current Live Value</th>
                <th style={thStyle}>Target Value</th>
                <th style={thStyle}>Warning Threshold %</th>
                <th style={thStyle}>Critical Threshold %</th>
              </tr>
            </thead>
            <tbody>
              {mergedRows.map(row => (
                <tr key={row.kpiName} style={{ borderTop: "1px solid #EEF2F7" }}>
                  <td style={tdStyle}>{row.kpiName}</td>
                  <td style={tdStyle}>{row.liveValue}</td>
                  <td style={tdStyle}><input type="number" value={row.targetValue} onChange={event => updateRow(row.kpiName, "targetValue", Number(event.target.value))} style={inputStyle} /></td>
                  <td style={tdStyle}><input type="number" value={row.warningThresholdPct} onChange={event => updateRow(row.kpiName, "warningThresholdPct", Number(event.target.value))} style={inputStyle} /></td>
                  <td style={tdStyle}><input type="number" value={row.criticalThresholdPct} onChange={event => updateRow(row.kpiName, "criticalThresholdPct", Number(event.target.value))} style={inputStyle} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const primaryButtonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "none", background: "#0F172A", color: "white", fontWeight: 800, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }
const secondaryButtonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #D9E1EC", background: "white", color: "#334155", fontWeight: 800, fontFamily: "'Outfit', sans-serif", cursor: "pointer" }
const inputStyle: React.CSSProperties = { width: 120, padding: "8px 10px", borderRadius: 10, border: "1px solid #D9E1EC", fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: "none" }
const thStyle: React.CSSProperties = { padding: "12px 14px", borderBottom: "1px solid #E2E8F0" }
const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: 13, color: "#334155" }
