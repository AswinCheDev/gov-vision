import { useEffect, useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import { api, getDeptKpiSummary, getKpiSummary, getRiskHeatmap, getTopViolatedPolicies } from "../services/api"
import type { IKpiSummary, IRiskHeatmapRow, RiskLevel } from "../types"
import { RISK_LEVEL_COLORS } from "../types"
import SkeletonLoader from "../components/SkeletonLoader"
import AccentDropdown from "../components/AccentDropdown"
import { getDepartmentColor } from "../utils/departmentColors"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import KPICard from "../components/KPICard"

const Icons = {
  compliance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}

const DEPARTMENT_OPTIONS = [
  { label: "Organization Wide", value: "" },
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
  background: "white",
  border: "1px solid #E2E6ED",
  borderRadius: "8px",
  padding: "10px 14px",
  fontSize: "14px",
  fontFamily: "'Outfit', sans-serif",
  color: "#374151",
  outline: "none",
  cursor: "pointer",
  minWidth: 160,
}

function formatFriendlyDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date)
}

export default function ComplianceAnalytics() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState(todayString())
  const [deptId, setDeptId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<IKpiSummary | null>(null)
  const [trend, setTrend] = useState<Array<{ department: string; data: Array<{ date: string; complianceRate: number }> }>>([])
  const [riskRows, setRiskRows] = useState<IRiskHeatmapRow[]>([])
  const [topPolicies, setTopPolicies] = useState<Array<{ policyId: string; policyName: string; violationCount: number; departments: string[] }>>([])
  const [policyFilter, setPolicyFilter] = useState<string>("")

  const deptQuery = deptId
  const selectedDepartmentLabel = DEPARTMENT_OPTIONS.find(option => option.value === deptId)?.label ?? ""

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [summary, policies, risk] = await Promise.all([
          deptId ? getDeptKpiSummary(deptId, { dateFrom, dateTo, deptId }) : getKpiSummary({ dateFrom, dateTo, deptId: "" }),
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

  const filteredTrend = deptId
    ? trend.filter(entry => entry.department === selectedDepartmentLabel)
    : trend

  const filteredRiskRows = deptId
    ? riskRows.filter(row => row.department === selectedDepartmentLabel || row.deptId === selectedDepartmentLabel)
    : riskRows

  const filteredTopPolicies = (() => {
    const deptScopedPolicies = deptId
      ? topPolicies.filter(row => row.departments.includes(selectedDepartmentLabel))
      : topPolicies

    return policyFilter
      ? deptScopedPolicies.filter(row => row.policyId === policyFilter || row.policyName === policyFilter)
      : deptScopedPolicies
  })()

  const severitySummary = useMemo(() => {
    const order = ["Low", "Medium", "High", "Critical"]
    return order.map(level => ({
      level,
      count: filteredRiskRows.reduce((sum, row: any) => sum + Number(row[level] ?? 0), 0)
    }))
  }, [filteredRiskRows])

  const heatmapOption: EChartsOption = useMemo(() => {
    const departmentNames = filteredTrend.map(entry => entry.department)
    const dateKeys = Array.from(new Set(filteredTrend.flatMap(entry => entry.data.map(point => point.date)))).sort()
    const data = filteredTrend.flatMap((entry, yIndex) =>
      entry.data.map(point => {
        const xIndex = dateKeys.indexOf(point.date)
        return [xIndex, yIndex, Number(point.complianceRate.toFixed(2))]
      })
    )

    return {
      tooltip: {
        position: "top",
        formatter: params => {
          const point = params as { value?: [number, number, number]; data?: [number, number, number]; axisValue?: string }
          const value = point.value ?? point.data
          const dateLabel = point.axisValue ? formatFriendlyDate(point.axisValue) : ""
          if (!value) return ""

          const department = departmentNames[value[1]] ?? ""
          const score = typeof value[2] === "number" ? value[2].toFixed(2) : value[2]

          return `${dateLabel}<br/>${department}: ${score}%`
        }
      },
      grid: { top: 10, left: 140, right: 20, bottom: 60 },
      xAxis: {
        type: "category",
        data: dateKeys,
        splitArea: { show: true },
        axisLabel: {
          fontFamily: "'Outfit', sans-serif",
          fontSize: 10,
          color: "#64748B",
          formatter: value => formatFriendlyDate(String(value))
        }
      },
      yAxis: { type: "category", data: departmentNames, splitArea: { show: true }, axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 11, color: "#334155" } },
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
  }, [filteredTrend])

  const severityChartOption: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { top: 20, right: 16, bottom: 36, left: 44 },
    xAxis: { type: "category", data: severitySummary.map(row => row.level), axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B" } },
    yAxis: { type: "value", axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B" }, splitLine: { lineStyle: { color: "#EEF2F7" } } },
    series: [{ 
      type: "bar", 
      data: severitySummary.map(row => ({
        value: row.count,
        itemStyle: { color: RISK_LEVEL_COLORS[row.level as RiskLevel] }
      })), 
      itemStyle: { borderRadius: [6, 6, 0, 0] } 
    }]
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 20, background: "#F5F6FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize:"12px", color:"#94A3B8", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px", fontFamily:"'Outfit', sans-serif" }}>
            <span>Home</span><span style={{color:"#CBD5E1"}}>›</span>
            <span>Analytics</span><span style={{color:"#CBD5E1"}}>›</span>
            <span style={{color:"#374151",fontWeight:600}}>Compliance Analytics</span>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#0F172A" }}>Compliance Analytics</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>Compliance trend, severity breakdown, department heatmap and top violated policies.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <AccentDropdown
            value={deptId}
            options={DEPARTMENT_OPTIONS}
            onChange={value => setDeptId(value)}
            width="200px"
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

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(1, minmax(0, 1fr))", gap: 16 }}>
            <KPICard 
              title="Compliance Rate" 
              value={Number((kpi?.complianceRate ?? 0).toFixed(2))}
              unit="%" 
              icon={Icons.compliance} 
              accentColor="#41A471" 
              bgGradient="linear-gradient(140deg,#26CC95,#0A9871)" 
              tone="soft" 
              size="md" 
            />
          </div>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Department Compliance Trend</h2>
            <ReactECharts option={buildTrendOption(filteredTrend)} style={{ height: 320 }} />
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
            <section style={sectionStyle}>
              <h2 style={headingStyle}>Risk Level Distribution</h2>
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
              <AccentDropdown
                value={policyFilter}
                options={[
                  { label: "All policies", value: "" },
                  ...topPolicies.map(row => ({ label: row.policyName, value: row.policyId }))
                ]}
                onChange={value => setPolicyFilter(value)}
                width="200px"
              />
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
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const rows = Array.isArray(params) ? params : [params]
        const dateLabel = String(rows[0]?.axisValue ?? "")
        const lines = rows.map((item: any) => {
          const value = typeof item?.value === "number" ? item.value.toFixed(2) : Number(item?.value ?? 0).toFixed(2)
          return `${item.marker ?? ""}${item.seriesName} <b>${value}%</b>`
        }).join("<br/>")
        return `${dateLabel}<br/>${lines}`
      }
    },
    legend: { bottom: 0, textStyle: { fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B" } },
    grid: { top: 18, right: 20, bottom: 42, left: 42 },
    xAxis: { type: "category", data: dates, axisLabel: { fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B", rotate: 0, formatter: value => formatFriendlyDate(String(value)) } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%", fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#64748B" } },
    series: trend.map((row) => ({
      type: "line",
      name: row.department,
      smooth: true,
      data: dates.map(date => row.data.find(point => point.date === date)?.complianceRate ?? null),
      lineStyle: { width: 2 },
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: getDepartmentColor(row.department) }
    })),
    color: trend.map(row => getDepartmentColor(row.department))
  }
}
const sectionStyle: React.CSSProperties = { background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 18, boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }
const headingStyle: React.CSSProperties = { margin: 0, marginBottom: 12, fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A" }
const thStyle: React.CSSProperties = { padding: "10px 8px", borderBottom: "1px solid #E2E8F0" }
const tdStyle: React.CSSProperties = { padding: "12px 8px", fontSize: 13, color: "#334155" }
