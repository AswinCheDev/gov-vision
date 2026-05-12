import { useEffect, useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import { api, getKpiSummary, getRiskHeatmap, getTopViolatedPolicies } from "../services/api"
import type { IKpiSummary, IRiskHeatmapRow } from "../types"
import SkeletonLoader from "../components/SkeletonLoader"

const DEPARTMENT_OPTIONS = [
  { label: "Finance", value: "FI001" },
  { label: "Human Resources", value: "HR002" },
  { label: "Operations", value: "OP003" },
  { label: "Information Technology", value: "IT004" },
  { label: "Customer Service", value: "CS005" }
]

function todayString(): string {
  return new Date().toISOString().split("T")[0]
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D9E1EC",
  background: "white",
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 13,
  minWidth: 160,
  outline: "none"
}

export default function ComplianceAnalytics() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState(todayString())
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(DEPARTMENT_OPTIONS.map(option => option.value))
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<IKpiSummary | null>(null)
  const [trend, setTrend] = useState<Array<{ department: string; data: Array<{ date: string; complianceRate: number }> }>>([])
  const [riskRows, setRiskRows] = useState<IRiskHeatmapRow[]>([])
  const [topPolicies, setTopPolicies] = useState<Array<{ policyId: string; policyName: string; violationCount: number; departments: string[] }>>([])
  const [policyFilter, setPolicyFilter] = useState<string>("")

  const deptQuery = selectedDeptIds.join(",")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [summary, policies, risk] = await Promise.all([
          getKpiSummary({ dateFrom, dateTo, deptId: null }),
          getTopViolatedPolicies(),
          getRiskHeatmap({ dateFrom, dateTo })
        ])

        const trendResponse = await api.get("/api/analytics/compliance-trend", {
          params: { dateFrom, dateTo, deptIds: deptQuery }
        })

        if (cancelled) return
        setKpi(summary)
        setTopPolicies(policies)
        setRiskRows(risk)
        setTrend(Array.isArray(trendResponse.data) ? trendResponse.data : [])
      } catch (error) {
        console.error("ComplianceAnalytics load error:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dateFrom, dateTo, deptQuery])

  const filteredTopPolicies = policyFilter ? topPolicies.filter(row => row.policyId === policyFilter || row.policyName === policyFilter) : topPolicies

  const severitySummary = useMemo(() => {
    const order = ["Low", "Medium", "High", "Critical"]
    return order.map(level => ({
      level,
      count: riskRows.reduce((sum, row: any) => sum + Number(row[level] ?? 0), 0)
    }))
  }, [riskRows])

  const heatmapOption: EChartsOption = useMemo(() => {
    const departmentNames = trend.map(entry => entry.department)
    const dateKeys = Array.from(new Set(trend.flatMap(entry => entry.data.map(point => point.date)))).sort()
    const data = trend.flatMap((entry, yIndex) =>
      entry.data.map(point => {
        const xIndex = dateKeys.indexOf(point.date)
        return [xIndex, yIndex, Number(point.complianceRate.toFixed(1))]
      })
    )

    return {
      tooltip: { position: "top" },
      grid: { top: 10, left: 140, right: 20, bottom: 60 },
      xAxis: { type: "category", data: dateKeys, splitArea: { show: true }, axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" } },
      yAxis: { type: "category", data: departmentNames, splitArea: { show: true }, axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 11, color: "#334155" } },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: { color: ["#EF4444", "#F59E0B", "#10B981"] }
      },
      series: [{ type: "heatmap", data, label: { show: false } }]
    }
  }, [trend])

  const severityChartOption: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { top: 20, right: 16, bottom: 36, left: 44 },
    xAxis: { type: "category", data: severitySummary.map(row => row.level), axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" } },
    yAxis: { type: "value", axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" }, splitLine: { lineStyle: { color: "#EEF2F7" } } },
    series: [{ type: "bar", data: severitySummary.map(row => row.count), itemStyle: { color: "#3B82F6", borderRadius: [6, 6, 0, 0] } }]
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 20, background: "#F5F6FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 28, fontWeight: 800, color: "#0F172A" }}>Compliance Analytics</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>Compliance trend, severity breakdown, department heatmap and top violated policies.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            multiple
            value={selectedDeptIds}
            onChange={event => setSelectedDeptIds(Array.from(event.target.selectedOptions).map(option => option.value))}
            style={{ ...selectStyle, minWidth: 220, height: 112 }}
          >
            {DEPARTMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} style={selectStyle} />
          <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} style={selectStyle} />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div style={{ background: "white", borderRadius: 18, border: "1px solid #E2E8F0", padding: 18 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", fontWeight: 700, fontFamily: "IBM Plex Sans, sans-serif" }}>Overall Compliance</div>
            <div style={{ marginTop: 8, fontSize: 42, fontWeight: 800, color: "#0F172A", fontFamily: "IBM Plex Sans, sans-serif" }}>{Number((kpi?.complianceRate ?? 0).toFixed(1))}%</div>
          </div>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Department Compliance Trend</h2>
            <ReactECharts option={buildTrendOption(trend)} style={{ height: 320 }} />
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
            <section style={sectionStyle}>
              <h2 style={headingStyle}>Violation Severity Breakdown</h2>
              <ReactECharts option={severityChartOption} style={{ height: 300 }} />
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Department Compliance Heatmap</h2>
              <ReactECharts option={heatmapOption} style={{ height: 300 }} />
            </section>
          </div>

          <section style={sectionStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h2 style={headingStyle}>Top Violated Policies</h2>
              <select value={policyFilter} onChange={event => setPolicyFilter(event.target.value)} style={selectStyle}>
                <option value="">All policies</option>
                {topPolicies.map(row => <option key={row.policyId} value={row.policyId}>{row.policyName}</option>)}
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#64748B", fontSize: 12 }}>
                    <th style={thStyle}>Policy Name</th>
                    <th style={thStyle}>Violation Count</th>
                    <th style={thStyle}>Departments Affected</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTopPolicies.map(row => (
                    <tr key={row.policyId} style={{ borderTop: "1px solid #E2E8F0", cursor: "pointer" }} onClick={() => setPolicyFilter(row.policyId)}>
                      <td style={tdStyle}>{row.policyName}</td>
                      <td style={tdStyle}>{row.violationCount}</td>
                      <td style={tdStyle}>{row.departments.filter(Boolean).join(", ") || "-"}</td>
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

function buildTrendOption(trend: Array<{ department: string; data: Array<{ date: string; complianceRate: number }> }>): EChartsOption {
  const dates = Array.from(new Set(trend.flatMap(row => row.data.map(point => point.date)))).sort()
  return {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" } },
    grid: { top: 18, right: 20, bottom: 42, left: 42 },
    xAxis: { type: "category", data: dates, axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B", rotate: 0 } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%", fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" } },
    series: trend.map((row, index) => ({
      type: "line",
      name: row.department,
      smooth: true,
      data: dates.map(date => row.data.find(point => point.date === date)?.complianceRate ?? null),
      lineStyle: { width: 2 },
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: COLORS[index % COLORS.length] }
    })),
    color: COLORS
  }
}

const COLORS = ["#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"]
const sectionStyle: React.CSSProperties = { background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 18, boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }
const headingStyle: React.CSSProperties = { margin: 0, marginBottom: 12, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A" }
const thStyle: React.CSSProperties = { padding: "10px 8px", borderBottom: "1px solid #E2E8F0" }
const tdStyle: React.CSSProperties = { padding: "12px 8px", fontSize: 13, color: "#334155" }
