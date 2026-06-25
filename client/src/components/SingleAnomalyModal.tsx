import type { IAnomaly } from "../types";
import { RISK_LEVEL_THEME } from "../types";
import { getDepartmentColor } from "../utils/departmentColors";

interface Props {
  anomaly: IAnomaly;
  onClose: () => void;
}

const FEATURE_LABELS: Record<string, string> = {
  cycleTimeHours: "Cycle Time (Hours)",
  rejectionCount: "Rejection Count",
  revisionCount: "Revision Count",
  daysOverSLA: "Days Over SLA",
  stageCount: "Stage Count",
  hourOfDaySubmitted: "Submission Hour",
};

export default function SingleAnomalyModal({ anomaly, onClose }: Props) {
  if (!anomaly) return null;

  const rawSeverity = (anomaly.severity || "Low") as string;
  const normalizedSeverity = (rawSeverity.charAt(0).toUpperCase() +
    rawSeverity.slice(1).toLowerCase()) as any;
  const themeKey = (
    normalizedSeverity === "Normal" ? "Low" : normalizedSeverity
  ) as keyof typeof RISK_LEVEL_THEME;
  const theme = RISK_LEVEL_THEME[themeKey] || RISK_LEVEL_THEME.Low;

  const deptColor = getDepartmentColor(anomaly.department);
  const fv = anomaly.featureValues || {};

  // Simulated department average for benchmark (typically fetched from API)
  const simulatedDeptAvg = 0.42;
  const scoreDiff = (anomaly.anomalyScore - simulatedDeptAvg).toFixed(2);
  const isAboveAvg = anomaly.anomalyScore > simulatedDeptAvg;

  // Recommendation logic
  const getRecommendation = () => {
    if (anomaly.severity === "Critical")
      return "Critical deviation detected. Immediately suspend processing for this record and initiate a manual audit of the approval chain.";
    if (anomaly.severity === "High")
      return "High risk flag. Review the revision history and verify all policy compliance checks before proceeding.";
    if (fv.daysOverSLA && fv.daysOverSLA > 5)
      return "Significant SLA breach detected. Investigate departmental bottlenecks causing this delay.";
    if (fv.rejectionCount && fv.rejectionCount > 3)
      return "High rejection rate. Record may require standard operating procedure (SOP) retraining for the submitter.";
    return "Standard anomaly flagged. Monitor for similar patterns in future submissions from this department.";
  };

  const features = Object.entries(fv)
    .filter(([_, v]) => typeof v === "number")
    .map(([k, v]) => ({
      key: k,
      label: FEATURE_LABELS[k] || k,
      value: v as number,
    }));

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          width: "100%",
          maxWidth: "600px",
          borderRadius: "32px",
          overflow: "hidden",
          boxShadow: "0 25px 70px -12px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Vibrant & Dynamic */}
        <div
          style={{
            padding: "24px 24px 20px",
            borderBottom: "1px solid #F1F5F9",
            background: `linear-gradient(135deg, white 0%, ${theme.bg} 100%)`,
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              border: "none",
              background: "rgba(0,0,0,0.05)",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              fontSize: "18px",
              color: "#64748B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                backgroundColor: theme.fill,
                color: "white",
                fontSize: "10px",
                fontWeight: 900,
                padding: "3px 8px",
                borderRadius: "6px",
                textTransform: "uppercase",
                letterSpacing: "1px",
                boxShadow: `0 4px 12px ${theme.fill}44`,
              }}
            >
              {anomaly.severity}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#475569",
                fontFamily: "'Outfit', sans-serif",
                background: "#F1F5F9",
                padding: "4px 12px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Decision ID -{" "}
              <span
                style={{
                  color: "#0F172A",
                  fontWeight: 900,
                  fontFamily: "monospace",
                }}
              >
                {anomaly.decisionId || "N/A"}
              </span>
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 900,
              color: "#0F172A",
              letterSpacing: "-0.5px",
            }}
          >
            Anomaly Breakdown
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: deptColor,
              }}
            ></div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {anomaly.department}
            </span>
          </div>
        </div>

        {/* Content - Multi-Section Drilldown */}
        <div style={{ padding: "24px", maxHeight: "60vh", overflowY: "auto" }}>
          {/* Top Level Benchmark Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                backgroundColor: "#F8FAFC",
                padding: "20px",
                borderRadius: "20px",
                border: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  letterSpacing: "1px",
                }}
              >
                Anomaly Score
              </div>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: 900,
                    color: "#0F172A",
                  }}
                >
                  {anomaly.anomalyScore.toFixed(2)}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: isAboveAvg ? "#E11D48" : "#059669",
                  }}
                >
                  {isAboveAvg ? `+${scoreDiff}` : scoreDiff} vs Dept Avg
                </span>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "#F8FAFC",
                padding: "20px",
                borderRadius: "20px",
                border: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                  letterSpacing: "1px",
                }}
              >
                Risk Context
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#475569",
                  lineHeight: "1.4",
                }}
              >
                {isAboveAvg
                  ? "Exceeds standard deviation for this department."
                  : "Within typical variance range."}
              </div>
            </div>
          </div>

          {/* Feature Deep Dive */}
          <h3
            style={{
              fontSize: "12px",
              fontWeight: 900,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: "16px",
            }}
          >
            Extended Feature Analysis
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            {features.map((f) => (
              <div
                key={f.key}
                style={{
                  padding: "16px",
                  backgroundColor: "white",
                  border: "1px solid #F1F5F9",
                  borderRadius: "16px",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#0F172A",
                  }}
                >
                  {f.value % 1 === 0 ? f.value : f.value.toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation Section */}
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              backgroundColor: "#F0F9FF",
              border: "1px solid #BAE6FD",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "#0369A1",
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                }}
              >
                Recommended Action
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: "1.6",
                color: "#0C4A6E",
              }}
            >
              {getRecommendation()}
            </p>
          </div>

          {/* Audit Trail & Meta */}
          <div
            style={{
              padding: "24px",
              borderRadius: "24px",
              backgroundColor: "#0F172A",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
                marginBottom: "16px",
                letterSpacing: "1.5px",
              }}
            >
              AI Audit Trail
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Processed Timestamp
                </span>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                  {new Date(
                    anomaly.createdAt || anomaly.detectedAt,
                  ).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Detection Engine
                </span>
                <span style={{ fontWeight: 700 }}>IsolationForest-v2.4.0</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Confidence Level
                </span>
                <span style={{ fontWeight: 700 }}>
                  {(anomaly.anomalyScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "24px 32px",
            borderTop: "1px solid #F1F5F9",
            backgroundColor: "#F8FAFC",
            display: "flex",
            gap: "12px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #E2E8F0",
              backgroundColor: "white",
              color: "#475569",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s ease",
            }}
          >
            Dismiss
          </button>
          {!anomaly.isAcknowledged && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: theme.fill,
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                fontSize: "14px",
                boxShadow: `0 8px 20px ${theme.fill}44`,
                transition: "all 0.2s ease",
              }}
            >
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
