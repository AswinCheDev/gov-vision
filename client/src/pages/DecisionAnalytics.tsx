import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import {
  getDeptKpiSummary,
  getKpiSummary,
  getRejectionReasons,
} from "../services/api";
import type { IKpiSummary, IFilter } from "../types";
import DecisionVolumeChart from "../components/charts/DecisionVolumeChart";
import CycleTimeHistogram from "../components/charts/CycleTimeHistogram";
import SkeletonLoader from "../components/SkeletonLoader";
import AccentDropdown from "../components/AccentDropdown";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import KPICard from "../components/KPICard";

const Icons = {
  decisions:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  approval:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>,
  rejection:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  cycle:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
};
const DEPARTMENT_OPTIONS = [
  { label: "Organization Wide", value: "" },
  { label: "Finance", value: "FI001" },
  { label: "Human Resources", value: "HR002" },
  { label: "Operations", value: "OP003" },
  { label: "Information Technology", value: "IT004" },
  { label: "Customer Service", value: "CS005" },
];

const GRANULARITY_OPTIONS: Array<{
  label: string;
  value: "daily" | "weekly" | "monthly";
}> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

type RejectionSlice = { name: string; value: number };
type FunnelSlice = { name: string; value: number };

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function toFilters(dateFrom: string, dateTo: string, deptId: string): IFilter {
  return { dateFrom, dateTo, deptId: deptId || null };
}

function downloadChart(node: HTMLElement | null, filename: string) {
  if (!node) return;
  void html2canvas(node, { backgroundColor: "#ffffff", scale: 2 }).then(
    (canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = filename;
      link.click();
    },
  );
}

function FunnelChart({ data }: { data: FunnelSlice[] }) {
  const [hoveredItem, setHoveredItem] = useState<FunnelSlice | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const chartRef = useRef<HTMLDivElement | null>(null);
  const sorted = [...data].sort((left, right) => right.value - left.value);
  const maxValue = Math.max(...sorted.map((item) => item.value), 1);
  const palette = ["#FFC107", "#F28C2A", "#6EB23F", "#5A97D6", "#A7A7A7"];

  const updateHoverPos = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(
      Math.max(event.clientX - rect.left + 14, 12),
      rect.width - 180,
    );
    const y = Math.min(
      Math.max(event.clientY - rect.top + 14, 12),
      rect.height - 90,
    );
    setHoverPos({ x, y });
  };

  return (
    <div
      ref={chartRef}
      style={{
        height: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        position: "relative",
      }}
    >
      <div style={{ minHeight: 34, marginBottom: 8 }}>
        {hoveredItem ? (
          <div
            style={{
              position: "absolute",
              left: hoverPos.x,
              top: hoverPos.y,
              zIndex: 10,
              background: "#FFFFFF",
              color: "#0F172A",
              border: "1px solid #D7DFEA",
              borderRadius: 10,
              padding: "8px 12px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
              minWidth: 180,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {hoveredItem.name}
            </div>
            <div style={{ opacity: 0.9 }}>
              Count: {hoveredItem.value.toLocaleString()}
            </div>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
              color: "#94A3B8",
              paddingTop: 8,
            }}
          ></div>
        )}
      </div>

      <div
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "150px minmax(0, 1fr)",
          gap: 20,
          alignItems: "center",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            paddingTop: 8,
            paddingBottom: 8,
            paddingRight: 4,
          }}
        >
          {sorted.map((item) => (
            <div
              key={item.name}
              style={{
                minHeight: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 6,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                color: "#6B7280",
              }}
            >
              {item.name}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gap: 0,
            justifyItems: "center",
            alignContent: "center",
            paddingTop: 10,
            paddingBottom: 14,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          {sorted.map((item, index) => {
            const nextValue = sorted[index + 1]?.value ?? 0;
            const topWidth = Math.max(22, (item.value / maxValue) * 100);
            const isLast = index === sorted.length - 1;
            const bottomWidth = isLast
              ? 6
              : Math.max(0, (nextValue / maxValue) * 100);
            const leftInset = (100 - topWidth) / 2;
            const rightInset = (100 - bottomWidth) / 2;

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
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 17,
                  fontWeight: 500,
                  textShadow: "0 1px 1px rgba(0,0,0,0.08)",
                }}
                title={`${item.name}: ${item.value}`}
                onMouseEnter={(event) => {
                  updateHoverPos(event);
                  setHoveredItem(item);
                }}
                onMouseMove={updateHoverPos}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {item.value.toLocaleString()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ApprovalBarChart({
  rows,
}: {
  rows: Array<{ label: string; approvalRate: number }>;
}) {
  const option: EChartsOption = {
    tooltip: { trigger: "axis" },
    grid: { top: 20, right: 18, bottom: 38, left: 42 },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.label),
      axisLabel: {
        fontFamily: "'Outfit', sans-serif",
        fontSize: 10,
        color: "#64748B",
        rotate: 0,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: "{value}%",
        fontFamily: "'Outfit', sans-serif",
        fontSize: 10,
        color: "#64748B",
      },
      splitLine: { lineStyle: { color: "#EEF2F7" } },
    },
    series: [
      {
        type: "bar",
        data: rows.map((row) => row.approvalRate),
        itemStyle: { color: "#10B981", borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 36,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 260 }} />;
}

export default function DecisionAnalytics() {
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState(todayString());
  const [deptId, setDeptId] = useState("");
  const [granularity, setGranularity] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<IKpiSummary | null>(null);
  const [rejections, setRejections] = useState<RejectionSlice[]>([]);
  const [approvalRows, setApprovalRows] = useState<
    Array<{ label: string; approvalRate: number }>
  >([]);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const cycleRef = useRef<HTMLDivElement | null>(null);
  const approvalRef = useRef<HTMLDivElement | null>(null);
  const funnelRef = useRef<HTMLDivElement | null>(null);
  const rejectionRef = useRef<HTMLDivElement | null>(null);

  const filters = useMemo(
    () => toFilters(dateFrom, dateTo, deptId),
    [dateFrom, dateTo, deptId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [summary, reasons] = await Promise.all([
          deptId ? getDeptKpiSummary(deptId, filters) : getKpiSummary(filters),
          getRejectionReasons({ dateFrom, dateTo }),
        ]);

        const approvalBase = deptId
          ? [
              {
                label: deptId,
                approvalRate: Number(
                  (
                    (summary.approvedCount /
                      Math.max(summary.totalDecisions, 1)) *
                    100
                  ).toFixed(1),
                ),
              },
            ]
          : await Promise.all(
              DEPARTMENT_OPTIONS.filter((option) => option.value).map(
                async (option) => {
                  const row = await getDeptKpiSummary(option.value, {
                    dateFrom,
                    dateTo,
                    deptId: option.value,
                  });
                  return {
                    label: option.label,
                    approvalRate: Number(
                      (
                        (row.approvedCount / Math.max(row.totalDecisions, 1)) *
                        100
                      ).toFixed(1),
                    ),
                  };
                },
              ),
            );

        if (cancelled) return;
        setKpi(summary);
        setRejections(reasons);
        setApprovalRows(approvalBase);
      } catch (error) {
        console.error("DecisionAnalytics load error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, deptId, filters]);

  const total = kpi?.totalDecisions ?? 0;
  const underReview = kpi ? kpi.approvedCount + kpi.rejectedCount : 0;
  const funnelData = [
    { name: "Submitted", value: total },
    { name: "Under Review", value: underReview },
    { name: "Approved", value: kpi?.approvedCount ?? 0 },
    { name: "Rejected", value: kpi?.rejectedCount ?? 0 },
  ];

  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gap: 20,
        background: "#F5F6FA",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize:"12px", color:"#94A3B8", marginBottom:"4px", display:"flex", alignItems:"center", gap:"6px", fontFamily:"'Outfit', sans-serif" }}>
            <span>Home</span><span style={{color:"#CBD5E1"}}>›</span>
            <span>Analytics</span><span style={{color:"#CBD5E1"}}>›</span>
            <span style={{color:"#374151",fontWeight:600}}>Decision Analytics</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            Decision Analytics
          </h1>
          <p style={{ margin: "6px 0 0", color: "#64748B", fontSize: 13 }}>
            Decision volume, cycle time, approvals, funnel and rejection
            breakdowns.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <AccentDropdown
            value={deptId}
            options={DEPARTMENT_OPTIONS}
            onChange={(value) => setDeptId(value)}
            width="180px"
          />
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
                  style={{
                    background: "white",
                    border: "1px solid #E2E6ED",
                    borderRadius: "8px",
                    padding: "10px 30px 10px 14px",
                    fontSize: "14px",
                    fontFamily: "'Outfit', sans-serif",
                    cursor: "pointer",
                    width: "140px",
                    outline: "none",
                    color: "#374151"
                  }}
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
                  style={{
                    background: "white",
                    border: "1px solid #E2E6ED",
                    borderRadius: "8px",
                    padding: "10px 30px 10px 14px",
                    fontSize: "14px",
                    fontFamily: "'Outfit', sans-serif",
                    cursor: "pointer",
                    width: "140px",
                    outline: "none",
                    color: "#374151"
                  }}
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
          <AccentDropdown
            value={granularity}
            options={GRANULARITY_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))}
            onChange={(value) => setGranularity(value as any)}
            width="120px"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <KPICard 
              title="Total Decisions" 
              value={total} 
              icon={Icons.decisions} 
              accentColor="#DBE5FF" 
              bgGradient="linear-gradient(140deg,#6F88D6,#516CC1)" 
              tone="hero" 
              size="lg" 
            />
            <KPICard 
              title="Approval Rate" 
              value={Number((((kpi?.approvedCount ?? 0) / Math.max(total, 1)) * 100).toFixed(1))}
              unit="%" 
              icon={Icons.approval} 
              accentColor="#C9EFDF" 
              bgGradient="linear-gradient(140deg,#6EAB95,#4E8D76)" 
              tone="hero" 
              size="lg" 
            />
            <KPICard 
              title="Rejection Rate" 
              value={Number((((kpi?.rejectedCount ?? 0) / Math.max(total, 1)) * 100).toFixed(1))}
              unit="%" 
              icon={Icons.rejection} 
              accentColor="#FFD0D4" 
              bgGradient="linear-gradient(140deg,#D47A87,#B95A68)" 
              invertTrend 
              tone="hero" 
              size="lg" 
            />
            <KPICard 
              title="Avg Cycle Time" 
              value={Number((kpi?.avgCycleTimeHours ?? 0).toFixed(1))}
              unit="h" 
              icon={Icons.cycle} 
              accentColor="#FFE0C0" 
              bgGradient="linear-gradient(140deg,#D8AF85,#BF946C)" 
              tone="hero" 
              size="lg" 
            />
          </div>

          <SectionCard
            title="Decision Volume"
            onExport={() =>
              downloadChart(volumeRef.current, "decision-volume.png")
            }
          >
            <div ref={volumeRef}>
              <DecisionVolumeChart filters={filters} />
            </div>
          </SectionCard>

          <SectionCard
            title="Cycle Time Distribution"
            onExport={() => downloadChart(cycleRef.current, "cycle-time.png")}
          >
            <div ref={cycleRef}>
              <CycleTimeHistogram filters={filters} />
            </div>
          </SectionCard>

          <SectionCard
            title="Approval Rate by Department"
            onExport={() =>
              downloadChart(approvalRef.current, "approval-rate.png")
            }
          >
            <div ref={approvalRef}>
              <ApprovalBarChart rows={approvalRows} />
            </div>
          </SectionCard>

          <SectionCard
            title="Status Funnel"
            onExport={() =>
              downloadChart(funnelRef.current, "status-funnel.png")
            }
          >
            <div ref={funnelRef}>
              <FunnelChart data={funnelData} />
            </div>
          </SectionCard>

          <SectionCard
            title="Rejection Count Per Department"
            onExport={() =>
              downloadChart(
                rejectionRef.current,
                "rejection-per-department.png",
              )
            }
          >
            <div ref={rejectionRef}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 550px) 1fr",
                  gap: 60,
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
              >
                <PieReasons data={rejections} />
                <div style={{ width: "100%" }}>
                  {rejections.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: "1px solid #EEF2F7",
                        fontSize: 15,
                      }}
                    >
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                  {rejections.length === 0 && (
                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      No rejected decisions found for the selected date range.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function PieReasons({ data }: { data: RejectionSlice[] }) {
  const colors = ["#EF4444", "#F97316", "#F59E0B", "#8B5CF6", "#06B6D4"];
  const pieData = data.length > 0 ? data : [{ name: "No data", value: 1 }];
  return (
    <div style={{ height: 350 }}>
      <ReactECharts
        option={{
          tooltip: { trigger: "item" },
          legend: {
            bottom: 0,
            width: 380,
            itemGap: 16,
            textStyle: { fontFamily: "'Outfit', sans-serif", fontSize: 12 },
            itemWidth: 16,
            itemHeight: 12,
            padding: [0, 0, 0, 0],
          },
          series: [
            {
              type: "pie",
              radius: [70, 130],
              center: ["50%", "42%"],
              data: pieData.map((item, index) => ({
                name: item.name,
                value: item.value,
                itemStyle: { color: colors[index % colors.length] },
              })),
              label: {
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                formatter: (params: any) => {
                  const name = params.name;
                  if (name === "Information Technology") return "Information\nTechnology";
                  if (name === "Customer Service") return "Customer\nService";
                  if (name === "Human Resources") return "Human\nResources";
                  return name;
                },
              },
            },
          ],
        }}
        style={{ height: 350 }}
      />
    </div>
  );
}

function SectionCard({
  title,
  children,
  onExport,
}: {
  title: string;
  children: React.ReactNode;
  onExport: () => void;
}) {
  return (
    <section
      style={{
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 1px 6px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: "#0F172A",
          }}
        >
          {title}
        </h2>
        <button type="button" onClick={onExport} style={ghostButtonStyle}>
          Export PNG
        </button>
      </div>
      {children}
    </section>
  );
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
  minWidth: 140,
};

const ghostButtonStyle: React.CSSProperties = {
  border: "1px solid #D9E1EC",
  background: "white",
  color: "#334155",
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'Outfit', sans-serif",
};
