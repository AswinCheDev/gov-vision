import { useState, useEffect } from "react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { getDeptKpiSummary } from "../../services/api"
import type { IFilter } from "../../types"

interface DepartmentData {
  department: string
  "Approval Rate": number
  "Compliance Rate": number
  "Throughput": number
  "Risk Score": number
  "Efficiency": number
}

const DEPARTMENTS = [
  { label: "Finance", value: "Finance" },
  { label: "Human Resources", value: "Human Resources" },
  { label: "Operations", value: "Operations" },
  { label: "Information Technology", value: "Information Technology" },
  { label: "Customer Service", value: "Customer Service" }
]

const COLORS = ["#6F88D6", "#26CC95", "#FF9142", "#D8AF85", "#A181FF"]

export default function DepartmentPerformanceRadar() {
  const [data, setData] = useState<DepartmentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const today = new Date()
        const dateFrom = "2024-01-01"
        const dateTo = today.toISOString().split("T")[0]

        const deptData: DepartmentData[] = await Promise.all(
          DEPARTMENTS.map(async (dept) => {
            const filter: IFilter = {
              dateFrom,
              dateTo,
              deptId: dept.value
            }
            const kpi = await getDeptKpiSummary(filter)

            // Normalize metrics to 0-100 scale
            const approvalRate = Math.min(100, kpi.approvalRate ?? 0)
            const complianceRate = Math.min(100, kpi.complianceRate ?? 0)
            const throughput = Math.min(100, Math.max(0, (kpi.decisionThroughput ?? 0) / 10)) // Assume max 1000/day
            const riskScore = Math.max(0, 100 - (typeof kpi.riskLevel === 'string' ? 
              (kpi.riskLevel === 'Low' ? 90 : kpi.riskLevel === 'Medium' ? 60 : kpi.riskLevel === 'High' ? 30 : 10)
              : 50
            ))
            const efficiency = Math.min(100, ((approvalRate + complianceRate) / 2) * 0.8 + (100 - (kpi.avgCycleTimeHours ?? 0) / 10) * 0.2)

            return {
              department: dept.label,
              "Approval Rate": Number(approvalRate.toFixed(1)),
              "Compliance Rate": Number(complianceRate.toFixed(1)),
              "Throughput": Number(throughput.toFixed(1)),
              "Risk Score": Number(riskScore.toFixed(1)),
              "Efficiency": Number(efficiency.toFixed(1))
            }
          })
        )

        setData(deptData)
      } catch (error) {
        console.error("Error fetching department performance data:", error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "8px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.8} width="40" height="40">
          <circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/><circle cx="16.66" cy="7.34" r="1" fill="currentColor"/><circle cx="7.34" cy="16.66" r="1" fill="currentColor"/><circle cx="16.66" cy="16.66" r="1" fill="currentColor"/><circle cx="7.34" cy="7.34" r="1" fill="currentColor"/>
        </svg>
        <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>Loading radar chart...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "8px" }}>
        <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0 }}>No department data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid 
          stroke="#E2E6ED" 
          strokeDasharray="3 3"
        />
        <PolarAngleAxis 
          dataKey="department" 
          stroke="#64748B"
          style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}
        />
        <PolarRadiusAxis 
          angle={90}
          domain={[0, 100]}
          stroke="#CBD5E1"
          style={{ fontSize: "11px", color: "#94A3B8" }}
        />
        
        {/* Radar series for each metric */}
        <Radar 
          name="Approval Rate" 
          dataKey="Approval Rate" 
          stroke={COLORS[0]} 
          fill={COLORS[0]} 
          fillOpacity={0.25}
          isAnimationActive={true}
        />
        <Radar 
          name="Compliance Rate" 
          dataKey="Compliance Rate" 
          stroke={COLORS[1]} 
          fill={COLORS[1]} 
          fillOpacity={0.15}
          isAnimationActive={true}
        />
        <Radar 
          name="Throughput" 
          dataKey="Throughput" 
          stroke={COLORS[2]} 
          fill={COLORS[2]} 
          fillOpacity={0.1}
          isAnimationActive={true}
        />
        
        <Tooltip 
          contentStyle={{
            background: "white",
            border: "1px solid #E2E6ED",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}
          formatter={(value) => `${Number(value).toFixed(1)}`}
          labelStyle={{ color: "#374151", fontWeight: 700 }}
        />
        
        <Legend 
          wrapperStyle={{ paddingTop: "16px", fontSize: "12px", fontFamily: "'Outfit', sans-serif" }}
          iconType="circle"
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
