import { useState } from "react"
import type { IAnomaly } from "../types"
import { RISK_LEVEL_THEME } from "../types"

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

interface Props {
  anomaly: IAnomaly
  onAcknowledge: (id: string) => Promise<void>
  onClick: (anomaly: IAnomaly) => void
}

const severityColors: Record<string, string> = {
  Critical: "#FADDDD",
  High: "#FDE9D6",
  Medium: "#FFF6CC",
  Low: "#DDF3E5",
  Normal: "#E5E7EB"
}

const severityText: Record<string, string> = {
  Critical: "#9C2F2F",
  High: "#9C4A00",
  Medium: "#8A6A00",
  Low: "#2E7D32",
  Normal: "#374151"
}

export default function AnomalyTableRow({ anomaly, onAcknowledge, onClick }: Props) {
  const [loading, setLoading] = useState(false)

  // Robust theme selection matching SingleAnomalyModal
  const rawSeverity = (anomaly.severity || "Low") as string
  const normalizedSeverity = (rawSeverity.charAt(0).toUpperCase() + rawSeverity.slice(1).toLowerCase()) as any
  const themeKey = (normalizedSeverity === "Normal" ? "Low" : normalizedSeverity) as keyof typeof RISK_LEVEL_THEME
  const theme = RISK_LEVEL_THEME[themeKey] || RISK_LEVEL_THEME.Low

  const decisionId = anomaly.decisionId ?? ""
  const createdAt = anomaly.createdAt ?? anomaly.detectedAt
  const cycleTimeHours = anomaly.featureValues?.cycleTimeHours ?? 0
  const rejectionCount = anomaly.featureValues?.rejectionCount ?? 0

  async function handleClick() {
    setLoading(true)
    try {
      await onAcknowledge(anomaly._id)
    } finally {
      setLoading(false)
    }
  }

  // Exact matching percentages from AnomalyDetection.tsx
  const widths = ["10%", "16%", "16%", "9%", "9%", "8%", "8%", "10%", "7%", "7%"]

  return (
    <tr
      onClick={() => onClick(anomaly)}
      style={{ transition: "background 0.2s ease", cursor: "pointer" }}
      onMouseEnter={event => {
        event.currentTarget.style.background = "#F8FAFC"
      }}
      onMouseLeave={event => {
        event.currentTarget.style.background = "transparent"
      }}
    >
      <td style={{ padding: "12px 12px", paddingLeft: "32px", color: "#64748B", fontSize: "14px", textAlign: "left", width: widths[0], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
      </td>
      <td style={{ padding: "12px 12px", fontSize: "14px", textAlign: "left", width: widths[1], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {decisionId ? (
          <a
            href={`http://localhost:3001/decisions/${decisionId}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ color: "#0F172A", textDecoration: "none", fontFamily: "monospace", fontWeight: 800 }}
          >
            {decisionId}
          </a>
        ) : (
          <span style={{ color: "#94A3B8" }}>N/A</span>
        )}
      </td>
      <td style={{ padding: "12px 12px", fontSize: "14px", color: "#334155", textAlign: "left", fontWeight: 600, width: widths[2], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {getDepartmentLabel(anomaly.department)}
      </td>
      <td style={{ padding: "12px 12px", textAlign: "left", width: widths[3] }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 900,
            padding: "4px 8px",
            borderRadius: "6px",
            background: severityColors[anomaly.severity] ?? "#E5E7EB",
            color: severityText[anomaly.severity] ?? "#374151",
            display: "inline-block",
            textTransform: "uppercase"
          }}
        >
          {anomaly.severity}
        </span>
      </td>
      <td style={{ padding: "12px 12px", textAlign: "left", width: widths[4] }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
          <span style={{ fontSize: "14px", fontFamily: "monospace", color: "#0F172A", fontWeight: 800 }}>
            {anomaly.anomalyScore.toFixed(2)}
          </span>
          <div style={{ width: "32px", height: "4px", background: "#E2E8F0", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(anomaly.anomalyScore * 100, 100)}%`, height: "100%", background: "#8B5CF6" }} />
          </div>
        </div>
      </td>
      <td style={{ padding: "12px 12px", fontSize: "14px", color: "#334155", textAlign: "left", fontWeight: 700, width: widths[5] }}>{cycleTimeHours}h</td>
      <td style={{ padding: "12px 12px", fontSize: "14px", color: "#334155", textAlign: "left", fontWeight: 700, width: widths[6] }}>{rejectionCount}</td>
      <td style={{ padding: "12px 12px", textAlign: "left", width: widths[7] }}>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: "6px",
            background: anomaly.isAcknowledged ? "#DCFCE7" : "#F1F5F9",
            color: anomaly.isAcknowledged ? "#166534" : "#64748B",
            display: "inline-block",
            whiteSpace: "nowrap",
            textTransform: "uppercase"
          }}
        >
          {anomaly.isAcknowledged ? "Acknowledged" : "Unacknowledged"}
        </span>
      </td>
      <td style={{ padding: "12px 12px", textAlign: "left", width: widths[8] }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClick(anomaly)
          }}
          style={{
            fontSize: "10px",
            fontWeight: 900,
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            padding: "6px 10px",
            background: "white",
            color: "#475569",
            cursor: "pointer",
            textTransform: "uppercase"
          }}
        >
          View
        </button>
      </td>
      <td style={{ padding: "12px 12px", textAlign: "left", width: widths[9] }}>
        {!anomaly.isAcknowledged && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              void handleClick()
            }}
            disabled={loading || anomaly.isAcknowledged}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              backgroundColor: theme.fill,
              color: "white",
              fontSize: "11px",
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              textTransform: "uppercase"
            }}
          >
            {loading ? "..." : "Acknowledge"}
          </button>
        )}
      </td>
    </tr>
  )
}
