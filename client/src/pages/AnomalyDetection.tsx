import { useEffect, useMemo, useRef, useState } from "react"
import { acknowledgeAnomaly, getAnomalyGroups } from "../services/api"
import type {
  IAnomaly,
  IAnomalyGroup,
  IFeatureImportance,
  IFeatureValues,
  Severity
} from "../types"
import { RISK_LEVEL_THEME } from "../types"
import AnomalyTableRow from "../components/AnomalyTableRow"
import FeatureImportanceChart from "../components/FeatureImportanceChart"
import AnomalyBreakdownModal from "../components/AnomalyBreakdownModal"
import SingleAnomalyModal from "../components/SingleAnomalyModal"

const INITIAL_GROUPS: IAnomalyGroup = {
  Critical: [],
  High: [],
  Medium: [],
  Low: [],
  total: 0
}

const severityOptions = ["All", "Critical", "High", "Medium", "Low"]

const DEPARTMENT_LABELS: Record<string, string> = {
  FI001: "Finance",
  finance: "Finance",
  Finance: "Finance",
  HR001: "Human Resources",
  HR002: "Human Resources",
  "human resources": "Human Resources",
  OPS001: "Operations",
  OP003: "Operations",
  operations: "Operations",
  IT001: "Information Technology",
  IT004: "Information Technology",
  "information technology": "Information Technology",
  CS005: "Customer Service",
  "customer service": "Customer Service",
  LEGAL001: "Legal",
  legal: "Legal"
}

function getDepartmentLabel(value: string): string {
  if (!value) return "Unknown"
  return DEPARTMENT_LABELS[value] || DEPARTMENT_LABELS[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1)
}

function flattenGroups(groups: IAnomalyGroup): IAnomaly[] {
  return [
    ...groups.Critical,
    ...groups.High,
    ...groups.Medium,
    ...groups.Low
  ]
}

function computeFeatureImportance(anomalies: IAnomaly[]): IFeatureImportance[] {
  if (anomalies.length === 0) return []

  const features: (keyof IFeatureValues)[] = [
    "cycleTimeHours",
    "rejectionCount",
    "revisionCount",
    "daysOverSLA",
    "stageCount",
    "hourOfDaySubmitted"
  ]

  const averages = features.map(feature => ({
    feature,
    avg:
      anomalies.reduce((sum, anomaly) => {
        const value = anomaly.featureValues?.[feature] ?? 0
        return sum + value
      }, 0) / anomalies.length
  }))

  const total = averages.reduce((sum, item) => sum + item.avg, 0) || 1

  return averages
    .map(({ feature, avg }) => ({
      feature,
      weight: Number(((avg / total) * 100).toFixed(2))
    }))
    .sort((a, b) => b.weight - a.weight)
}

function StatCard({
  label,
  value,
  sub,
  gradient,
  icon,
  onClick
}: {
  label: string
  value: number
  sub: string
  gradient: string
  icon?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: gradient,
        borderRadius: 16,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
        color: "white",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        minHeight: "140px",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease"
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)"
          e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)"
          e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        }
      }}
    >
      {/* Background circles */}
      <div style={{
        position: "absolute",
        top: "-20px", right: "-20px",
        width: "90px", height: "90px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.16)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-30px", right: "10px",
        width: "110px", height: "110px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        pointerEvents: "none"
      }} />

      {/* Ambient dot texture */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
        backgroundSize: "6px 6px",
        opacity: 0.3,
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", zIndex: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          {label}
        </span>
        {icon && (
          <div style={{
            width: 24, height: 24,
            borderRadius: 6,
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.3)"
          }}>
            {icon}
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: 54,
          fontWeight: 800,
          color: "white",
          lineHeight: 1,
          letterSpacing: "-2px",
          zIndex: 1,
          fontFamily: "'Outfit', sans-serif",
          marginTop: "auto"
        }}
      >
        {value}
      </span>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%", zIndex: 1, marginTop: 4 }}>
        <div style={{ minHeight: "18px" }}>
          {sub && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
              {sub}
            </span>
          )}
        </div>
        {onClick && (
          <span style={{ 
            fontSize: "10px", 
            fontWeight: 800, 
            textTransform: "uppercase", 
            letterSpacing: "0.05em", 
            color: "rgba(255,255,255,0.9)",
            background: "rgba(255,255,255,0.15)",
            padding: "3px 8px",
            borderRadius: "6px",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            View Breakdown
          </span>
        )}
      </div>
    </div>
  )
}

type DropdownOption = {
  label: string
  value: string
}

function AccentDropdown({
  value,
  options,
  onChange,
  width = "190px"
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener("mousedown", onMouseDown)
    return () => window.removeEventListener("mousedown", onMouseDown)
  }, [])

  const selected = options.find(option => option.value === value) ?? options[0]

  return (
    <div ref={rootRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: "9px",
          border: open ? "1px solid var(--accent-600)" : "1px solid #E2E8F0",
          background: "white",
          fontSize: "13px",
          fontWeight: 500,
          color: "#334155",
          fontFamily: "inherit",
          cursor: "pointer",
          outline: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px var(--accent-ring)" : "none"
        }}
      >
        <span>{selected?.label}</span>
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "#6B7280", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: "100%",
            background: "#FFFFFF",
            border: "1px solid var(--accent-300)",
            borderRadius: "10px",
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
            padding: "5px",
            zIndex: 60
          }}
        >
          {options.map(option => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: isSelected ? "#E5E7EB" : "transparent",
                  color: isSelected ? "#111827" : "#334155",
                  borderRadius: "7px",
                  textAlign: "left",
                  padding: "7px 10px",
                  fontSize: "12px",
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  transition: "background 0.15s ease,color 0.15s ease"
                }}
                onMouseEnter={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "#F3F4F6"
                  event.currentTarget.style.color = "#1F2937"
                }}
                onMouseLeave={event => {
                  if (isSelected) return
                  event.currentTarget.style.background = "transparent"
                  event.currentTarget.style.color = "#334155"
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DeepInsights() {
  const [anomalyData, setAnomalyData] = useState<IAnomalyGroup>(INITIAL_GROUPS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState("All")
  const [deptFilter, setDeptFilter] = useState("All")
  const [breakdownSeverity, setBreakdownSeverity] = useState<Severity | null>(null)
  const [selectedAnomaly, setSelectedAnomaly] = useState<IAnomaly | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    getAnomalyGroups()
      .then(data => {
        setAnomalyData(data)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load anomaly data.")
        setLoading(false)
      })
  }, [])

  const allAnomalies = useMemo(() => flattenGroups(anomalyData), [anomalyData])

  const departmentOptions = useMemo(() => {
    const values = Array.from(new Set(allAnomalies.map(a => a.department))).sort()
    return ["All", ...values.map(value => getDepartmentLabel(value))]
  }, [allAnomalies])

  const filtered = useMemo(() => {
    return allAnomalies.filter(anomaly => {
      const severityMatch = severityFilter === "All" || anomaly.severity === severityFilter
      const deptMatch =
        deptFilter === "All" || getDepartmentLabel(anomaly.department) === deptFilter
      return severityMatch && deptMatch
    })
  }, [allAnomalies, severityFilter, deptFilter])

  const featureImportance = useMemo(
    () => computeFeatureImportance(allAnomalies),
    [allAnomalies]
  )

  async function handleAcknowledge(id: string) {
    await acknowledgeAnomaly(id)
    setAnomalyData(prev => ({
      ...prev,
      Critical: prev.Critical.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      High: prev.High.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      Medium: prev.Medium.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a)),
      Low: prev.Low.map(a => (a._id === id ? { ...a, isAcknowledged: true } : a))
    }))
  }

  const StatIcons = {
    total: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
    critical: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    high: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    medium: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    low: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="14" height="14"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  }

  const severityDropdownOptions = severityOptions.map(opt => ({
    label: opt === "All" ? "All severities" : opt,
    value: opt
  }))

  const departmentDropdownOptions = departmentOptions.map(opt => ({
    label: opt === "All" ? "All departments" : opt,
    value: opt
  }))

  const tableHeaders = [
    "Date",
    "Decision ID",
    "Department",
    "Severity",
    "Score",
    "Cycle Time",
    "Rejections",
    "Status",
    "Action"
  ]

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FA",
        fontFamily: "var(--font-sans)"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ padding: "28px 28px 40px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Breadcrumb + Title */}
          <div>
            <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Outfit', sans-serif" }}>
              <span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
              <span>Deep Insights</span><span style={{ color: "#CBD5E1" }}>›</span>
              <span style={{ color: "#374151", fontWeight: 600 }}>Anomaly Detection</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#0F172A",
                    letterSpacing: "-0.6px"
                  }}
                >
                  Anomaly Detection
                </h1>
                <p style={{ margin: "5px 0 0", fontSize: 13, color: "#64748B" }}>
                  Detailed anomaly investigation with severity and department filtering.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#B91C1C",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <span style={{ fontSize: 16 }}>⚠</span>
              {error}
            </div>
          )}

          {/* Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 12
            }}
          >
            <StatCard
              label="Total Anomalies"
              value={anomalyData.total}
              sub="Across all departments"
              gradient="linear-gradient(135deg, #8250FF, #4D12E8)"
              icon={StatIcons.total}
            />
            <StatCard
              label="Critical"
              value={anomalyData.Critical.length}
              sub="Needs immediate action"
              gradient="linear-gradient(135deg, #FF2E54, #D1002D)"
              icon={StatIcons.critical}
              onClick={() => setBreakdownSeverity("Critical")}
            />
            <StatCard
              label="High"
              value={anomalyData.High.length}
              sub="Review within 24h"
              gradient="linear-gradient(135deg, #FF9F0A, #E67E00)"
              icon={StatIcons.high}
              onClick={() => setBreakdownSeverity("High")}
            />
            <StatCard
              label="Medium"
              value={anomalyData.Medium.length}
              sub=""
              gradient="linear-gradient(135deg, #FFD60A, #FFB300)"
              icon={StatIcons.medium}
              onClick={() => setBreakdownSeverity("Medium")}
            />
            <StatCard
              label="Low"
              value={anomalyData.Low.length}
              sub=""
              gradient="linear-gradient(135deg, #00E699, #00A669)"
              icon={StatIcons.low}
              onClick={() => setBreakdownSeverity("Low")}
            />
          </div>

          {/* Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              background: "#fff",
              border: "1px solid #E6EBF2",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              padding: "12px 16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", marginRight: 2 }}>
                Filter by
              </span>
              <AccentDropdown
                value={severityFilter}
                options={severityDropdownOptions}
                onChange={setSeverityFilter}
              />
              <AccentDropdown
                value={deptFilter}
                options={departmentDropdownOptions}
                onChange={setDeptFilter}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
                Showing{" "}
                <strong style={{ color: "#0F172A" }}>{filtered.length}</strong> of{" "}
                {allAnomalies.length} anomalies
              </span>
              {(severityFilter !== "All" || deptFilter !== "All") && (
                <button
                  onClick={() => {
                    setSeverityFilter("All")
                    setDeptFilter("All")
                  }}
                  style={{
                    border: "1px solid #E2E8F0",
                    background: "transparent",
                    color: "#64748B",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 7,
                    cursor: "pointer",
                    fontFamily: "inherit"
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    background: "linear-gradient(90deg, #E2E8F0 25%, #EEF2F7 50%, #E2E8F0 75%)",
                    backgroundSize: "400% 100%",
                    animation: "shimmer 1.4s infinite"
                  }}
                />
              ))}
              <style>{`@keyframes shimmer { 0% { background-position: 100% 50% } 100% { background-position: 0% 50% } }`}</style>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                border: "1px solid #E6EBF2",
                borderRadius: 14,
                boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                overflow: "hidden"
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed"
                  }}
                >
                  <thead>
                    <tr style={{ background: "#FAFBFC" }}>
                      {[
                        { label: "DATE", w: "10%" },
                        { label: "DECISION ID", w: "16%" },
                        { label: "DEPARTMENT", w: "16%" },
                        { label: "SEVERITY", w: "9%" },
                        { label: "SCORE", w: "9%" },
                        { label: "CYCLE TIME", w: "8%" },
                        { label: "REJECTIONS", w: "8%" },
                        { label: "STATUS", w: "10%" },
                        { label: "BREAKDOWN", w: "7%" },
                        { label: "ACTION", w: "7%" }
                      ].map((col, idx) => (
                        <th
                          key={col.label}
                          style={{
                            textAlign: "left",
                            padding: "14px 12px",
                            paddingLeft: idx === 0 ? "32px" : "12px",
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            borderBottom: "1px solid #F1F5F9",
                            whiteSpace: "nowrap",
                            width: col.w
                          }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable tbody container */}
              <div
                style={{
                  maxHeight: "500px",
                  overflowY: "scroll",
                  overflowX: "auto",
                  scrollBehavior: "smooth"
                }}
              >
                <style>{`
                  [data-anomaly-scroll]::-webkit-scrollbar {
                    width: 8px;
                  }
                  [data-anomaly-scroll]::-webkit-scrollbar-track {
                    background: "#F8FAFC";
                  }
                  [data-anomaly-scroll]::-webkit-scrollbar-thumb {
                    background: "#CBD5E1";
                    border-radius: 4px;
                  }
                  [data-anomaly-scroll]::-webkit-scrollbar-thumb:hover {
                    background: "#94A3B8";
                  }
                `}</style>
                <table
                  data-anomaly-scroll
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 1090,
                    tableLayout: "fixed"
                  }}
                >
                  <tbody>
                    {filtered.map(anomaly => (
                      <AnomalyTableRow
                        key={anomaly._id}
                        anomaly={anomaly}
                        onAcknowledge={handleAcknowledge}
                        onClick={setSelectedAnomaly}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length === 0 && (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#F8FAFC",
                      border: "1px solid #E6EBF2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      marginBottom: 4
                    }}
                  >
                    🔍
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                    No anomalies found
                  </span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    Try adjusting your filters to see more results.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Feature Importance Chart */}
          <FeatureImportanceChart data={featureImportance} />
        </main>

        {breakdownSeverity && (
          <AnomalyBreakdownModal
            severity={breakdownSeverity}
            anomalies={anomalyData[breakdownSeverity]}
            onClose={() => setBreakdownSeverity(null)}
          />
        )}

        {selectedAnomaly && (
          <SingleAnomalyModal
            anomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
          />
        )}
      </div>
    </div>
  )
}