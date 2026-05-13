import { useEffect, useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import { getDeptKpiSummary } from "../services/api"
import type { IFilter, IKpiSummary } from "../types"
import SkeletonLoader from "../components/SkeletonLoader"
import AccentDropdown from "../components/AccentDropdown"
import { getDepartmentColor } from "../utils/departmentColors"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

const DEPARTMENT_OPTIONS = [
  { label: "Finance", value: "FI001" },
  { label: "Human Resources", value: "HR002" },
  { label: "Operations", value: "OP003" },
  { label: "Information Technology", value: "IT004" },
  { label: "Customer Service", value: "CS005" }
]

const DEPARTMENT_FILTER_OPTIONS = [
  { label: "All Departments", value: "all" },
  ...DEPARTMENT_OPTIONS
]

const METRICS = [
  { label: "Cycle Time", key: "avgCycleTimeHours" },
  { label: "Compliance", key: "complianceRate" },
  { label: "Volume", key: "totalDecisions" },
  { label: "Risk Score", key: "riskScore" },
  { label: "Violation Count", key: "violationCount" }
] as const

type MetricKey = typeof METRICS[number]["key"]
type MetricTabKey = MetricKey | "all"

function todayString(): string {
  return new Date().toISOString().split("T")[0]
}

function toFilters(dateFrom: string, dateTo: string): IFilter {
  return { dateFrom, dateTo, deptId: null }
}

function riskValue(summary: Partial<IKpiSummary>): number {
  const riskLevel = String((summary as any).riskLevel ?? "Low").toLowerCase()
  if (riskLevel === "critical") return 100
  if (riskLevel === "high") return 75
  if (riskLevel === "medium") return 50
  return 25
}

export default function DepartmentPerformance() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState(todayString())
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"bar" | "radar">("bar")
  const [selectedMetric, setSelectedMetric] = useState<MetricTabKey>("all")
  const [current, setCurrent] = useState<Array<IKpiSummary & { departmentId: string }>>([])
  const [previous, setPrevious] = useState<Array<IKpiSummary & { departmentId: string }>>([])
  const selectedDeptIds = useMemo(
    () => selectedDeptFilter === "all" ? DEPARTMENT_OPTIONS.map(option => option.value) : [selectedDeptFilter],
    [selectedDeptFilter]
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const activeFilters = toFilters(dateFrom, dateTo)
        const prevStart = new Date(dateFrom)
        prevStart.setDate(prevStart.getDate() - 7)
        const prevEnd = new Date(dateTo)
        prevEnd.setDate(prevEnd.getDate() - 7)
        const previousFilters = toFilters(prevStart.toISOString().split("T")[0], prevEnd.toISOString().split("T")[0])

        const [currentRows, previousRows] = await Promise.all([
          Promise.all(selectedDeptIds.map(async deptId => ({ ...(await getDeptKpiSummary(deptId, { ...activeFilters, deptId })), departmentId: deptId }))),
          Promise.all(selectedDeptIds.map(async deptId => ({ ...(await getDeptKpiSummary(deptId, { ...previousFilters, deptId })), departmentId: deptId })))
        ])

        if (cancelled) return
        setCurrent(currentRows)
        setPrevious(previousRows)
      } catch (error) {
        console.error("DepartmentPerformance load error:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dateFrom, dateTo, selectedDeptIds])

  const rows = useMemo(() => {
    return current.map(item => {
      const prev = previous.find(previousRow => previousRow.departmentId === item.departmentId)
      const currentScore = Number((item.totalDecisions ?? 0))
      const previousScore = Number((prev?.totalDecisions ?? 0))
      const delta = currentScore === previousScore ? 0 : currentScore > previousScore ? 1 : -1
      return {
        ...item,
        displayName: DEPARTMENT_OPTIONS.find(option => option.value === item.departmentId)?.label ?? item.departmentId,
        riskScore: riskValue(item),
        rankDelta: delta
      }
    }).sort((a, b) => Number(b.totalDecisions ?? 0) - Number(a.totalDecisions ?? 0))
  }, [current, previous])

  const radarOption: EChartsOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B" } },
    radar: {
      indicator: METRICS.map(metric => ({ name: metric.label, max: metric.key === "totalDecisions" ? 1000 : metric.key === "violationCount" ? 100 : 100 })),
      splitArea: { areaStyle: { color: ["#fff", "#FAFBFD"] } }
    },
    series: [{
      type: "radar",
      data: rows.map(row => ({
        name: row.displayName,
        value: [
          Number((row.avgCycleTimeHours ?? 0).toFixed(2)),
          Number((row.complianceRate ?? 0).toFixed(2)),
          Number(row.totalDecisions ?? 0),
          Number(row.riskScore ?? 0),
          Number(row.violationCount ?? 0)
        ],
        lineStyle: { color: getDepartmentColor(row.departmentId) },
        areaStyle: { color: getDepartmentColor(row.departmentId), opacity: 0.12 },
        itemStyle: { color: getDepartmentColor(row.departmentId) }
      }))
    }],
    color: DEPARTMENT_OPTIONS.map(option => getDepartmentColor(option.value))
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => Number((b as any)[selectedMetric] ?? 0) - Number((a as any)[selectedMetric] ?? 0)), [rows, selectedMetric])

  return (
    <div style={{ padding: 24, display: "grid", gap: 20, background: "#F5F6FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize:"12px", color:"#94A3B8", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px", fontFamily:"'Outfit', sans-serif" }}>
            <span>Home</span><span style={{color:"#CBD5E1"}}>›</span>
            <span>Analytics</span><span style={{color:"#CBD5E1"}}>›</span>
            <span style={{color:"#374151",fontWeight:600}}>Department Performance</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#0F172A" }}>Department Performance</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>Compare up to five departments on core KPI metrics.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <AccentDropdown
            value={selectedDeptFilter}
            options={DEPARTMENT_FILTER_OPTIONS}
            onChange={value => setSelectedDeptFilter(value)}
            width="220px"
          />
          <span style={{ color: "#CBD5E1" }}>-</span>
          <span style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>From</span>
          <div style={{ position: "relative" }}>
            <DatePicker
              selected={new Date(dateFrom)}
              onChange={(date: Date | null) => {
                if (date) setDateFrom(date.toISOString().split("T")[0])
              }}
              dateFormat="dd MMM yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="scroll"
              popperPlacement="bottom-start"
              maxDate={new Date(dateTo)}
              minDate={new Date("2024-01-01")}
              customInput={
                <input
                  style={{ ...selectStyle, padding: "10px 30px 10px 14px", width: "140px", minWidth: "140px" }}
                />
              }
            />
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span style={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>To</span>
          <div style={{ position: "relative" }}>
            <DatePicker
              selected={new Date(dateTo)}
              onChange={(date: Date | null) => {
                if (date) setDateTo(date.toISOString().split("T")[0])
              }}
              dateFormat="dd MMM yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="scroll"
              popperPlacement="bottom-start"
              minDate={new Date(dateFrom)}
              maxDate={new Date("2026-12-31")}
              customInput={
                <input
                  style={{ ...selectStyle, padding: "10px 30px 10px 14px", width: "140px", minWidth: "140px" }}
                />
              }
            />
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setSelectedMetric("all")} style={{ ...tabButtonStyle, background: selectedMetric === "all" ? "#0F172A" : "white", color: selectedMetric === "all" ? "white" : "#334155" }}>
          All
        </button>
        {METRICS.map(metric => (
          <button key={metric.key} type="button" onClick={() => setSelectedMetric(metric.key)} style={{ ...tabButtonStyle, background: selectedMetric === metric.key ? "#0F172A" : "white", color: selectedMetric === metric.key ? "white" : "#334155" }}>
            {metric.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setViewMode("bar")} style={{ ...tabButtonStyle, background: viewMode === "bar" ? "#0F172A" : "white", color: viewMode === "bar" ? "white" : "#334155" }}>Bar Chart</button>
        <button type="button" onClick={() => setViewMode("radar")} style={{ ...tabButtonStyle, background: viewMode === "radar" ? "#0F172A" : "white", color: viewMode === "radar" ? "white" : "#334155" }}>Radar</button>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          {viewMode === "radar" ? (
            <section style={sectionStyle}>
              <h2 style={headingStyle}>Comparison Radar</h2>
              <ReactECharts option={radarOption} style={{ height: 420 }} />
            </section>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
              {METRICS.map(metric => (
                <MetricBarCard key={metric.key} title={metric.label} rows={sortedRows} metricKey={metric.key} highlighted={selectedMetric === metric.key} dimmed={selectedMetric !== "all" && selectedMetric !== metric.key} />
              ))}
            </div>
          )}

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Ranking Table</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, color: "#64748B" }}>
                    <th style={thStyle}>Rank</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Avg Cycle Time</th>
                    <th style={thStyle}>Total Decisions</th>
                    <th style={thStyle}>Compliance</th>
                    <th style={thStyle}>Risk Score</th>
                    <th style={thStyle}>Violation Count</th>
                    <th style={thStyle}>Rank Change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.departmentId} style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}>{row.displayName}</td>
                      <td style={tdStyle}>{Number(row.avgCycleTimeHours ?? 0).toFixed(2)}h</td>
                      <td style={tdStyle}>{Number(row.totalDecisions ?? 0)}</td>
                      <td style={tdStyle}>{Number((row.complianceRate ?? 0).toFixed(2))}%</td>
                      <td style={tdStyle}>{Number(row.riskScore ?? 0)}</td>
                      <td style={tdStyle}>{Number(row.violationCount ?? 0)}</td>
                      <td style={tdStyle}>{row.rankDelta === 0 ? "—" : row.rankDelta > 0 ? "▲ +1" : "▼ -1"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function MetricBarCard({ title, rows, metricKey, highlighted, dimmed }: { title: string; rows: Array<IKpiSummary & { departmentId: string; displayName: string }>; metricKey: MetricKey; highlighted: boolean; dimmed: boolean }) {
  const option: EChartsOption = {
    grid: { top: 18, right: 16, bottom: 48, left: 42 },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const rows = Array.isArray(params) ? params : [params]
        const first = rows[0]
        if (!first) return ""
        const value = typeof first.value === "number" ? first.value : Number(first.value ?? 0)
        return `${first.axisValueLabel ?? ""}<br/>${first.marker ?? ""}${title}: <b>${value.toFixed(2)}</b>`
      }
    },
    xAxis: { type: "category", data: rows.map(row => row.displayName), axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 10, rotate: 0 } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#EEF2F7" } }, axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 10 } },
    series: [{
      type: "bar",
      data: rows.map(row => ({
        value: Number((row as any)[metricKey] ?? 0),
        itemStyle: {
          color: getDepartmentColor(row.departmentId),
          opacity: highlighted ? 1 : 0.82
        }
      })),
      itemStyle: { borderRadius: [6, 6, 0, 0] }
    }]
  }

  return (
    <section style={{ ...sectionStyle, opacity: dimmed ? 0.35 : 1, filter: dimmed ? "grayscale(1) saturate(0.35)" : "none", transition: "opacity 0.2s ease, filter 0.2s ease" }}>
      <h2 style={headingStyle}>{title}</h2>
      <ReactECharts option={option} style={{ height: 260 }} />
    </section>
  )
}

const sectionStyle: React.CSSProperties = { background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 18, boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }
const headingStyle: React.CSSProperties = { margin: 0, marginBottom: 12, fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A" }
const selectStyle: React.CSSProperties = { background: "white", border: "1px solid #E2E6ED", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontFamily: "'Outfit', sans-serif", color: "#374151", outline: "none", cursor: "pointer", minWidth: 160 }
const tabButtonStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 12, border: "1px solid #D9E1EC", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }
const thStyle: React.CSSProperties = { padding: "10px 8px", borderBottom: "1px solid #E2E8F0" }
const tdStyle: React.CSSProperties = { padding: "12px 8px", fontSize: 13, color: "#334155" }
