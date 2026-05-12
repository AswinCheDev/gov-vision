import { useEffect, useMemo, useRef, useState } from "react"
import html2canvas from "html2canvas"
import ReactECharts from "echarts-for-react"
import type { EChartsOption } from "echarts"
import {
  getDeptKpiSummary,
  getKpiSummary,
  getRejectionReasons
} from "../services/api"
import type { IKpiSummary, IFilter } from "../types"
import DecisionVolumeChart from "../components/charts/DecisionVolumeChart"
import CycleTimeHistogram from "../components/charts/CycleTimeHistogram"
import SkeletonLoader from "../components/SkeletonLoader"

const DEPARTMENT_OPTIONS = [
  { label: "Organization Wide", value: "" },
  { label: "Finance", value: "FI001" },
  { label: "Human Resources", value: "HR002" },
  { label: "Operations", value: "OP003" },
  { label: "Information Technology", value: "IT004" },
  { label: "Customer Service", value: "CS005" }
]

const GRANULARITY_OPTIONS: Array<{ label: string; value: "daily" | "weekly" | "monthly" }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
]

type RejectionSlice = { name: string; value: number }
type FunnelSlice = { name: string; value: number }

function todayString(): string {
  return new Date().toISOString().split("T")[0]
}

function toFilters(dateFrom: string, dateTo: string, deptId: string): IFilter {
  return { dateFrom, dateTo, deptId: deptId || null }
}

function downloadChart(node: HTMLElement | null, filename: string) {
  if (!node) return
  void html2canvas(node, { backgroundColor: "#ffffff", scale: 2 }).then(canvas => {
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = filename
    link.click()
  })
}

function FunnelChart({ data }: { data: FunnelSlice[] }) {
  const [hoveredItem, setHoveredItem] = useState<FunnelSlice | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const chartRef = useRef<HTMLDivElement | null>(null)
  const sorted = [...data].sort((left, right) => right.value - left.value)
  const maxValue = Math.max(...sorted.map(item => item.value), 1)
  const palette = ["#FFC107", "#F28C2A", "#6EB23F", "#5A97D6", "#A7A7A7"]

  const updateHoverPos = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(Math.max(event.clientX - rect.left + 14, 12), rect.width - 180)
    const y = Math.min(Math.max(event.clientY - rect.top + 14, 12), rect.height - 90)
    setHoverPos({ x, y })
  }

  return (
    <div ref={chartRef} style={{ height: 380, display: "flex", flexDirection: "column", justifyContent: "flex-start", position: "relative" }}>
      <div style={{ minHeight: 34, marginBottom: 8 }}>
        {hoveredItem ? (
          <div style={{
            position: "absolute",
            left: hoverPos.x,
            top: hoverPos.y,
            zIndex: 10,
            background: "#FFFFFF",
            color: "#0F172A",
            border: "1px solid #D7DFEA",
            borderRadius: 10,
            padding: "8px 12px",
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: 12,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
            minWidth: 180
          }}>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>{hoveredItem.name}</div>
            <div style={{ opacity: 0.9 }}>Count: {hoveredItem.value.toLocaleString()}</div>
          </div>
        ) : (
          <div style={{ fontFamily: "IBM Plex Sans, sans-serif", fontSize: 12, color: "#94A3B8", paddingTop: 8 }}>
            Hover a funnel stage for details
          </div>
        )}
      </div>

      <div style={{ width: "100%", display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: 20, alignItems: "center", flex: 1 }}>
        <div style={{ display: "grid", gap: 12, paddingTop: 8, paddingBottom: 8, paddingRight: 4 }}>
          {sorted.map(item => (
            <div
              key={item.name}
              style={{
                minHeight: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 6,
                fontFamily: "IBM Plex Sans, sans-serif",
                fontSize: 13,
                color: "#6B7280"
              }}
            >
              {item.name}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 0, justifyItems: "center", alignContent: "center", paddingTop: 10, paddingBottom: 14, paddingLeft: 20, paddingRight: 20 }}>
          {sorted.map((item, index) => {
            const nextValue = sorted[index + 1]?.value ?? 0
            const topWidth = Math.max(22, (item.value / maxValue) * 100)
            const isLast = index === sorted.length - 1
            const bottomWidth = isLast ? 6 : Math.max(0, (nextValue / maxValue) * 100)
            const leftInset = (100 - topWidth) / 2
            const rightInset = (100 - bottomWidth) / 2

            return (
              <div
                key={item.name}
                style={{
                  width: `${topWidth}%`,
                  minWidth: isLast ? 92 : 108,
                  height: isLast ? 64 : 56,
                  marginTop: index === 0 ? 0 : -2,
                  clipPath: `polygon(${leftInset}% 0%, ${100 - leftInset}% 0%, ${100 - rightInset}% 100%, ${rightInset}% 100%)`,
                  background: palette[index % palette.length],
                  border: "1px solid #FFFFFF",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontFamily: "IBM Plex Sans, sans-serif",
                  fontSize: 17,
                  fontWeight: 500,
                  textShadow: "0 1px 1px rgba(0,0,0,0.08)"
                }}
                title={`${item.name}: ${item.value}`}
                onMouseEnter={event => {
                  updateHoverPos(event)
                  setHoveredItem(item)
                }}
                onMouseMove={updateHoverPos}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {item.value.toLocaleString()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ApprovalBarChart({ rows }: { rows: Array<{ label: string; approvalRate: number }> }) {
  const option: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { top: 20, right: 18, bottom: 38, left: 42 },
    xAxis: {
      type: "category",
      data: rows.map(row => row.label),
      axisLabel: { fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B", rotate: 0 }
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: "{value}%", fontFamily: "IBM Plex Sans", fontSize: 10, color: "#64748B" },
      splitLine: { lineStyle: { color: "#EEF2F7" } }
    },
    series: [
      {
        type: "bar",
        data: rows.map(row => row.approvalRate),
        itemStyle: { color: "#10B981", borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 36
      }
    ]
  }

  return <ReactECharts option={option} style={{ height: 260 }} />
}

export default function DecisionAnalytics() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState(todayString())
  const [deptId, setDeptId] = useState("")
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily")
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<IKpiSummary | null>(null)
  const [rejections, setRejections] = useState<RejectionSlice[]>([])
  const [approvalRows, setApprovalRows] = useState<Array<{ label: string; approvalRate: number }>>([])
  const volumeRef = useRef<HTMLDivElement | null>(null)
  const cycleRef = useRef<HTMLDivElement | null>(null)
  const approvalRef = useRef<HTMLDivElement | null>(null)
  const funnelRef = useRef<HTMLDivElement | null>(null)
  const rejectionRef = useRef<HTMLDivElement | null>(null)

  const filters = useMemo(() => toFilters(dateFrom, dateTo, deptId), [dateFrom, dateTo, deptId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [summary, reasons] = await Promise.all([
          deptId ? getDeptKpiSummary(deptId, filters) : getKpiSummary(filters),
          getRejectionReasons({ dateFrom, dateTo })
        ])

        const approvalBase = deptId
          ? [{ label: deptId, approvalRate: Number(((summary.approvedCount / Math.max(summary.totalDecisions, 1)) * 100).toFixed(1)) }]
          : await Promise.all(
              DEPARTMENT_OPTIONS.filter(option => option.value).map(async option => {
                const row = await getDeptKpiSummary(option.value, { dateFrom, dateTo, deptId: option.value })
                return {
                  label: option.label,
                  approvalRate: Number(((row.approvedCount / Math.max(row.totalDecisions, 1)) * 100).toFixed(1))
                }
              })
            )

        if (cancelled) return
        setKpi(summary)
        setRejections(reasons)
        setApprovalRows(approvalBase)
      } catch (error) {
        console.error("DecisionAnalytics load error:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [dateFrom, dateTo, deptId, filters])

  const total = kpi?.totalDecisions ?? 0
  const underReview = kpi ? (kpi.approvedCount + kpi.rejectedCount) : 0
  const funnelData = [
    { name: "Submitted", value: total },
    { name: "Under Review", value: underReview },
    { name: "Approved", value: kpi?.approvedCount ?? 0 },
    { name: "Rejected", value: kpi?.rejectedCount ?? 0 }
  ]

  return (
    <div style={{ padding: 24, display: "grid", gap: 20, background: "#F5F6FA", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 28, fontWeight: 800, color: "#0F172A" }}>Decision Analytics</h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>Decision volume, cycle time, approvals, funnel and rejection breakdowns.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={deptId} onChange={event => setDeptId(event.target.value)} style={selectStyle}>
            {DEPARTMENT_OPTIONS.map(option => <option key={option.label} value={option.value}>{option.label}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} style={selectStyle} />
          <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} style={selectStyle} />
          <select value={granularity} onChange={event => setGranularity(event.target.value as any)} style={selectStyle}>
            {GRANULARITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <SummaryTile label="Total Decisions" value={total.toLocaleString()} />
            <SummaryTile label="Approval Rate" value={`${Number(((kpi?.approvedCount ?? 0) / Math.max(total, 1) * 100).toFixed(1))}%`} />
            <SummaryTile label="Rejection Rate" value={`${Number(((kpi?.rejectedCount ?? 0) / Math.max(total, 1) * 100).toFixed(1))}%`} />
            <SummaryTile label="Avg Cycle Time" value={`${Number((kpi?.avgCycleTimeHours ?? 0).toFixed(1))}h`} />
          </div>

          <SectionCard title="Decision Volume" onExport={() => downloadChart(volumeRef.current, "decision-volume.png")}>
            <div ref={volumeRef}><DecisionVolumeChart filters={filters} /></div>
          </SectionCard>

          <SectionCard title="Cycle Time Distribution" onExport={() => downloadChart(cycleRef.current, "cycle-time.png")}>
            <div ref={cycleRef}><CycleTimeHistogram filters={filters} /></div>
          </SectionCard>

          <SectionCard title="Approval Rate by Department" onExport={() => downloadChart(approvalRef.current, "approval-rate.png")}>
            <div ref={approvalRef}><ApprovalBarChart rows={approvalRows} /></div>
          </SectionCard>

          <SectionCard title="Status Funnel" onExport={() => downloadChart(funnelRef.current, "status-funnel.png")}>
            <div ref={funnelRef}><FunnelChart data={funnelData} /></div>
          </SectionCard>

          <SectionCard title="Rejection Reasons" onExport={() => downloadChart(rejectionRef.current, "rejection-reasons.png")}>
            <div ref={rejectionRef}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 360px) 1fr", gap: 16, alignItems: "center" }}>
                <PieReasons data={rejections} />
                <div>
                  {rejections.map(item => (
                    <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #EEF2F7", fontSize: 13 }}>
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                  {rejections.length === 0 && <div style={{ color: "#64748B", fontSize: 13 }}>No rejected decisions found for the selected date range.</div>}
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}

function PieReasons({ data }: { data: RejectionSlice[] }) {
  const colors = ["#EF4444", "#F97316", "#F59E0B", "#8B5CF6", "#06B6D4"]
  const pieData = data.length > 0 ? data : [{ name: "No data", value: 1 }]
  return (
    <div style={{ height: 260 }}>
      <ReactECharts
        option={{
          tooltip: { trigger: "item" },
          legend: { bottom: 0, textStyle: { fontFamily: "IBM Plex Sans", fontSize: 10 } },
          series: [{
            type: "pie",
            radius: [45, 90],
            center: ["50%", "45%"],
            data: pieData.map((item, index) => ({ name: item.name, value: item.value, itemStyle: { color: colors[index % colors.length] } })),
            label: { fontFamily: "IBM Plex Sans", fontSize: 10 }
          }]
        }}
        style={{ height: 260 }}
      />
    </div>
  )
}

function SectionCard({ title, children, onExport }: { title: string; children: React.ReactNode; onExport: () => void }) {
  return (
    <section style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 18, boxShadow: "0 1px 6px rgba(15,23,42,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 16, fontWeight: 800, color: "#0F172A" }}>{title}</h2>
        <button type="button" onClick={onExport} style={ghostButtonStyle}>Export PNG</button>
      </div>
      {children}
    </section>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid #E2E8F0", padding: 16 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B", fontWeight: 700, fontFamily: "IBM Plex Sans, sans-serif" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#0F172A", fontFamily: "IBM Plex Sans, sans-serif" }}>{value}</div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #D9E1EC",
  background: "white",
  fontFamily: "IBM Plex Sans, sans-serif",
  fontSize: 13,
  minWidth: 140,
  outline: "none"
}

const ghostButtonStyle: React.CSSProperties = {
  border: "1px solid #D9E1EC",
  background: "white",
  color: "#334155",
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "IBM Plex Sans, sans-serif"
}