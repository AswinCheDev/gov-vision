import { useState, useEffect, useRef } from "react";
import { getRiskHeatmap } from "../services/api";
import type { RiskEntry, RiskLevel } from "../types";
import RiskTable from "../components/RiskTable";
import RiskPieChart from "../components/RiskPieChart";
import RiskLevelBadge from "../components/RiskLevelBadge";
import FeatureBreakdownModal from "../components/FeatureBreakdownModal";
import SkeletonLoader from "../components/SkeletonLoader";

// Filter options for the level filter dropdown
const LEVEL_FILTERS: Array<"All" | RiskLevel> = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

function normalizeRiskLevel(level: string | undefined): RiskLevel {
  const value = String(level || "Low").toLowerCase();
  if (value === "critical") return "Critical";
  if (value === "high") return "High";
  if (value === "medium") return "Medium";
  return "Low";
}

function StatCard({
  label,
  value,
  sub,
  gradient,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  sub: string;
  gradient: string;
  icon?: React.ReactNode;
  onClick?: () => void;
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
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        minHeight: "140px",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow =
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.16)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30px",
          right: "10px",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "6px 6px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
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
          marginTop: "auto",
        }}
      >
        {value}
      </span>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          width: "100%",
          zIndex: 1,
          marginTop: 4,
        }}
      >
        <div style={{ minHeight: "18px" }}>
          {sub && (
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.85)",
                fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {sub}
            </span>
          )}
        </div>
        {onClick && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.9)",
              background: "rgba(255,255,255,0.15)",
              padding: "3px 8px",
              borderRadius: "6px",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            Filter View
          </span>
        )}
      </div>
    </div>
  );
}

type DropdownOption = {
  label: string;
  value: string;
};

function AccentDropdown({
  value,
  options,
  onChange,
  width = "190px",
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div ref={rootRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
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
          boxShadow: open ? "0 0 0 3px var(--accent-ring)" : "none",
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
          style={{
            color: "#6B7280",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
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
            zIndex: 60,
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
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
                  transition: "background 0.15s ease,color 0.15s ease",
                }}
                onMouseEnter={(event) => {
                  if (isSelected) return;
                  event.currentTarget.style.background = "#F3F4F6";
                  event.currentTarget.style.color = "#1F2937";
                }}
                onMouseLeave={(event) => {
                  if (isSelected) return;
                  event.currentTarget.style.background = "transparent";
                  event.currentTarget.style.color = "#334155";
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const StatIcons = {
  critical: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      width="14"
      height="14"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  high: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      width="14"
      height="14"
    >
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  medium: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      width="14"
      height="14"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  low: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      width="14"
      height="14"
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

export default function RiskPage() {
  const [data, setData] = useState<RiskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<"All" | RiskLevel>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [selectedEntry, setSelectedEntry] = useState<RiskEntry | null>(null); // For modal

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getRiskHeatmap();
        const normalized: RiskEntry[] = rows.map((row: any) => ({
          departmentId:
            row.departmentId || row.deptId || row.department || "unknown",
          department:
            row.department || row.departmentId || row.deptId || "Unknown",
          riskScore: Number(row.riskScore ?? 0),
          riskLevel: normalizeRiskLevel(row.riskLevel),
          Low: Number(row.Low ?? row.low ?? 0),
          Medium: Number(row.Medium ?? row.medium ?? 0),
          High: Number(row.High ?? row.high ?? 0),
          Critical: Number(row.Critical ?? row.critical ?? 0),
          featureImportance: row.featureImportance || undefined,
        }));
        setData(normalized);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load risk data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter options
  const departmentOptions = Array.from(new Set(data.map((d) => d.department)))
    .filter((d) => d !== "Organization Wide")
    .sort();

  // Apply filters
  const filteredData = data.filter((row) => {
    const levelMatch = levelFilter === "All" || row.riskLevel === levelFilter;
    const deptMatch = deptFilter === "All" || row.department === deptFilter;
    return levelMatch && deptMatch;
  });

  // Summary counts for the header stat cards (exclude organization wide aggregate)
  const dataForCounts = filteredData.filter(
    (r) => r.department !== "Organization Wide",
  );
  const counts = {
    Critical: dataForCounts.filter((r) => r.riskLevel === "Critical").length,
    High: dataForCounts.filter((r) => r.riskLevel === "High").length,
    Medium: dataForCounts.filter((r) => r.riskLevel === "Medium").length,
    Low: dataForCounts.filter((r) => r.riskLevel === "Low").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <div
          style={{
            fontSize: "12px",
            color: "#94A3B8",
            marginBottom: "4px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <span>Home</span>
          <span style={{ color: "#CBD5E1" }}>›</span>
          <span>Deep Insights</span>
          <span style={{ color: "#CBD5E1" }}>›</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>
            Risk Assessment
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Risk Score Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Risk classification updated daily. Click any department for feature
          breakdown.
        </p>
      </div>

      {/* Summary stat cards */}
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <StatCard
            label="Critical Risk"
            value={counts.Critical}
            sub="Immediate intervention required"
            gradient="linear-gradient(135deg, #FF2E54, #D1002D)"
            icon={StatIcons.critical}
            onClick={() =>
              setLevelFilter(levelFilter === "Critical" ? "All" : "Critical")
            }
          />
          <StatCard
            label="High Risk"
            value={counts.High}
            sub=""
            gradient="linear-gradient(135deg, #FF9F0A, #E67E00)"
            icon={StatIcons.high}
            onClick={() =>
              setLevelFilter(levelFilter === "High" ? "All" : "High")
            }
          />
          <StatCard
            label="Medium Risk"
            value={counts.Medium}
            sub=""
            gradient="linear-gradient(135deg, #FFD60A, #FFB300)"
            icon={StatIcons.medium}
            onClick={() =>
              setLevelFilter(levelFilter === "Medium" ? "All" : "Medium")
            }
          />
          <StatCard
            label="Low Risk"
            value={counts.Low}
            sub=""
            gradient="linear-gradient(135deg, #00E699, #00A669)"
            icon={StatIcons.low}
            onClick={() =>
              setLevelFilter(levelFilter === "Low" ? "All" : "Low")
            }
          />
        </div>
      )}

      {/* Filter row */}
      {!loading && !error && (
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
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#94A3B8",
                marginRight: 2,
              }}
            >
              Filter by
            </span>
            <AccentDropdown
              value={levelFilter}
              options={[
                { label: "All severities", value: "All" },
                { label: "Critical", value: "Critical" },
                { label: "High", value: "High" },
                { label: "Medium", value: "Medium" },
                { label: "Low", value: "Low" },
              ]}
              onChange={(val) => setLevelFilter(val as any)}
            />
            <AccentDropdown
              value={deptFilter}
              options={[
                { label: "All departments", value: "All" },
                ...departmentOptions.map((d) => ({ label: d, value: d })),
              ]}
              onChange={setDeptFilter}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
              Showing{" "}
              <strong style={{ color: "#0F172A" }}>
                {filteredData.length}
              </strong>{" "}
              of {data.length} records
            </span>
            {(levelFilter !== "All" || deptFilter !== "All") && (
              <button
                onClick={() => {
                  setLevelFilter("All");
                  setDeptFilter("All");
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
                  fontFamily: "inherit",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading / error / content */}
      {loading && <SkeletonLoader rows={5} />}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table — takes 2/3 width on large screens */}
          <div className="lg:col-span-2">
            <RiskTable data={filteredData} onRowClick={setSelectedEntry} />
          </div>
          {/* Pie chart — takes 1/3 width */}
          <div>
            <RiskPieChart
              data={data.filter(
                (row) => deptFilter === "All" || row.department === deptFilter,
              )}
            />
          </div>
        </div>
      )}

      {/* Feature breakdown modal */}
      <FeatureBreakdownModal
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
}
