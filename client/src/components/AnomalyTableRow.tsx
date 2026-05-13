import { useState } from "react"
import type { IAnomaly } from "../types"

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

export default function AnomalyTableRow({ anomaly, onAcknowledge }: Props) {
  const [loading, setLoading] = useState(false)

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

  return (
    <tr
      style={{ borderBottom: "1px solid #E5E7EB", transition: "background 0.16s ease" }}
      onMouseEnter={event => {
        event.currentTarget.style.background = "#F9FAFB"
      }}
      onMouseLeave={event => {
        event.currentTarget.style.background = "transparent"
      }}
    >
      <td style={{ padding: "12px 8px", color: "#64748B", fontSize: "13px", width: "100px" }}>
        {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
      </td>
      <td style={{ padding: "12px 8px", fontSize: "13px", width: "160px" }}>
        {decisionId ? (
          <a
            href={`http://localhost:3001/decisions/${decisionId}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#374151", textDecoration: "none", fontFamily: "monospace", fontWeight: 700, wordBreak: "break-all" }}
          >
            {decisionId.length > 15 ? decisionId.slice(0, 12) + "..." : decisionId}
          </a>
        ) : (
          <span style={{ color: "#94A3B8" }}>N/A</span>
        )}
      </td>
      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#334155", width: "140px" }}>{getDepartmentLabel(anomaly.department)}</td>
      <td style={{ padding: "12px 8px", width: "100px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 700,
            padding: "4px 9px",
            borderRadius: "999px",
            background: severityColors[anomaly.severity] ?? "#E5E7EB",
            color: severityText[anomaly.severity] ?? "#374151",
            display: "inline-block"
          }}
        >
          {anomaly.severity}
        </span>
      </td>
      <td style={{ padding: "12px 8px", fontSize: "13px", fontFamily: "monospace", color: "#0F172A", width: "75px", textAlign: "center" }}>
        {anomaly.anomalyScore.toFixed(2)}
      </td>
      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#334155", width: "95px", textAlign: "center" }}>{cycleTimeHours}h</td>
      <td style={{ padding: "12px 8px", fontSize: "13px", color: "#334155", width: "85px", textAlign: "center" }}>{rejectionCount}</td>
      <td style={{ padding: "12px 8px", width: "135px" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: "999px",
            background: anomaly.isAcknowledged ? "#DCFCE7" : "#F1F5F9",
            color: anomaly.isAcknowledged ? "#166534" : "#6B7280",
            display: "inline-block"
          }}
        >
          {anomaly.isAcknowledged ? "Acknowledged" : "Unacknowledged"}
        </span>
      </td>
      <td style={{ padding: "12px 8px", width: "100px", textAlign: "center" }}>
        {!anomaly.isAcknowledged && (
          <button
            onClick={() => void handleClick()}
            disabled={loading}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              border: "none",
              borderRadius: "8px",
              padding: "6px 10px",
              background: "#374151",
              color: "white",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "wait" : "pointer"
            }}
          >
            {loading ? "..." : "Acknowledge"}
          </button>
        )}
      </td>
    </tr>
  )
}
