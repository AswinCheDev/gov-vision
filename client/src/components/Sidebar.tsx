import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { decodeToken } from "../utils/auth"

const dashboardItem = {
  label: "Dashboard",
  path: "/dashboard",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

const reportsItem = {
  label: "Reports",
  path: "/reports",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

const analyticsItems = [
  {
    label: "Decision Analytics",
    path: "/analytics/decisions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M4 19h16" />
        <path d="M7 16V8" />
        <path d="M12 16V4" />
        <path d="M17 16v-6" />
      </svg>
    )
  },
  {
    label: "Compliance Analytics",
    path: "/analytics/compliance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  {
    label: "Department Performance",
    path: "/analytics/departments",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M3 17h18" />
        <path d="M6 13v4" />
        <path d="M12 9v8" />
        <path d="M18 5v12" />
      </svg>
    )
  }
]

const adminItems = [
  {
    label: "KPI Config",
    path: "/admin/kpi-config",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M12 15v2" />
        <path d="M12 7a4 4 0 100 8 4 4 0 000-8z" />
        <path d="M19.4 15a7.9 7.9 0 00.1-1 7.9 7.9 0 00-.1-1l2-1.6-2-3.4-2.4.8a7.5 7.5 0 00-1.7-1L15 5h-6l-.3 2.8a7.5 7.5 0 00-1.7 1l-2.4-.8-2 3.4L4.6 13a7.9 7.9 0 000 2l-2 1.6 2 3.4 2.4-.8a7.5 7.5 0 001.7 1L9 23h6l.3-2.8a7.5 7.5 0 001.7-1l2.4.8 2-3.4-2-1.6z" />
      </svg>
    )
  },
  {
    label: "AI/ML Insights",
    path: "/ai/insights",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M4 19h16" />
        <path d="M6 15l3-4 3 2 4-6 2 3" />
      </svg>
    )
  }
]

const aiFeatureItems = [
  {
    label: "Anomaly Detection",
    path: "/anomaly",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  },
  {
    label: "Forecast",
    path: "/forecast",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="21 12 21 7 16 7" />
      </svg>
    )
  },
  {
    label: "Risk Assessment",
    path: "/risk",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  }
]

const bottomItems = [
  {
    label: "Settings",
    path: "/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    )
  },
  {
    label: "Support",
    path: "/support",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const [isNewReportHovered, setIsNewReportHovered] = useState(false)
  const [isNewReportFocused, setIsNewReportFocused] = useState(false)
  const currentRole = decodeToken()?.role ?? "guest"

  const allNavItems = [dashboardItem, ...analyticsItems, ...aiFeatureItems, reportsItem, ...adminItems, ...bottomItems]
  const activeNavLabel = allNavItems.find(item => location.pathname.startsWith(item.path))?.label ?? ""

  return (
    <aside style={{
      width: collapsed ? "74px" : "220px",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #222733 0%, #1B202A 100%)",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.05)",
      position: "fixed",
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 50,
      overflowY: "auto",
      transition: "width 0.2s ease"
    }}>
      {/* Subtle texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: [
            "radial-gradient(rgba(255,255,255,0.045) 0.6px, transparent 0.6px)",
            "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 6px)"
          ].join(", "),
          backgroundSize: "4px 4px, 12px 12px",
          opacity: 0.32,
          zIndex: 0
        }}
      />

      {/* Brand */}
      <div style={{
        padding: collapsed ? "18px 12px" : "24px 20px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        zIndex: 1,
        minHeight: "73px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: collapsed ? "16px" : "21px", letterSpacing: "-0.3px", fontFamily: "'Outfit', sans-serif" }}>
            {collapsed ? "GV" : "GovVision"}
          </div>
          {!collapsed && (
            <button
              type="button"
              title="Collapse sidebar"
              onClick={onToggleCollapse}
              style={{
                width: "34px",
                height: "28px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>
        {collapsed && (
          <>
            <button
              type="button"
              title="Expand sidebar"
              onClick={onToggleCollapse}
              style={{
                marginTop: "10px",
                width: "44px",
                height: "28px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "10px auto 0"
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {activeNavLabel && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "7.5px",
                  color: "rgba(255,255,255,0.75)",
                  textAlign: "center",
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  width: "100%",
                  padding: "0"
                }}
              >
                {activeNavLabel === "Risk Assessment" 
                  ? "RISK" 
                  : activeNavLabel === "Anomaly Detection"
                  ? "ANOMALY"
                  : activeNavLabel.toUpperCase()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "12px 10px", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "6px" }}>
          <NavLink
            key={dashboardItem.path}
            to={dashboardItem.path}
            end
            title={dashboardItem.label}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: collapsed ? "0" : "10px",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: "10px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              color: isActive ? "white" : "rgba(255,255,255,0.5)",
              background: isActive
                ? "var(--accent-grad-soft)"
                : "transparent",
              borderLeft: isActive ? "3px solid var(--accent-edge)" : "3px solid transparent",
              transition: "all 0.18s ease",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              fontFamily: "'Outfit', sans-serif"
            })}
          >
            {dashboardItem.icon}
            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dashboardItem.label}</span>}
          </NavLink>

          <div style={{ marginTop: "12px", marginBottom: "4px" }}>
            {!collapsed && (
              <div style={{
                padding: "8px 12px 10px",
                color: "rgba(255,255,255,0.6)",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Outfit', sans-serif",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                marginBottom: "6px"
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Analytics</span>
              </div>
            )}
            {collapsed && <div style={{ width: "30px", height: "1px", background: "rgba(255,255,255,0.07)", margin: "12px auto" }} />}

            {analyticsItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                title={item.label}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? "0" : "10px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginBottom: "2px",
                  textDecoration: "none",
                  color: isActive ? "white" : "rgba(255,255,255,0.5)",
                  background: isActive ? "var(--accent-grad-soft)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent-edge)" : "3px solid transparent",
                  transition: "all 0.18s ease",
                  fontSize: "12.8px",
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Outfit', sans-serif"
                })}
              >
                {item.icon}
                {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          <div style={{ marginTop: "12px", marginBottom: "4px" }}>
            {!collapsed && (
              <div style={{
                padding: "8px 12px 10px",
                color: "rgba(255,255,255,0.6)",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'Outfit', sans-serif",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                marginBottom: "6px"
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Deep Insights</span>
              </div>
            )}
            {collapsed && (
              <div style={{
                width: "30px",
                height: "1px",
                background: "rgba(255,255,255,0.07)",
                margin: "12px auto"
              }} />
            )}
            
            {aiFeatureItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                title={item.label}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? "0" : "10px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginBottom: "2px",
                  textDecoration: "none",
                  color: isActive ? "white" : "rgba(255,255,255,0.5)",
                  background: isActive
                    ? "var(--accent-grad-soft)"
                    : "transparent",
                  borderLeft: isActive ? "3px solid var(--accent-edge)" : "3px solid transparent",
                  transition: "all 0.18s ease",
                  fontSize: "12.8px",
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Outfit', sans-serif"
                })}
              >
                {item.icon}
                {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
              </NavLink>
            ))}
          </div>

          <div style={{ marginTop: "12px" }}>
            <NavLink
              key={reportsItem.path}
              to={reportsItem.path}
              title={reportsItem.label}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: collapsed ? "0" : "10px",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: "10px 12px",
                borderRadius: "10px",
                marginBottom: "2px",
                textDecoration: "none",
                color: isActive ? "white" : "rgba(255,255,255,0.5)",
                background: isActive
                  ? "var(--accent-grad-soft)"
                  : "transparent",
                borderLeft: isActive ? "3px solid var(--accent-edge)" : "3px solid transparent",
                transition: "all 0.18s ease",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Outfit', sans-serif"
              })}
            >
              {reportsItem.icon}
              {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{reportsItem.label}</span>}
            </NavLink>
          </div>

          {currentRole === "admin" && (
            <div style={{ marginTop: "12px" }}>
              {!collapsed && (
                <div style={{
                  padding: "8px 12px 10px",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'Outfit', sans-serif",
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  marginBottom: "6px"
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Admin</span>
                </div>
              )}
              {collapsed && <div style={{ width: "30px", height: "1px", background: "rgba(255,255,255,0.07)", margin: "12px auto" }} />}

              {adminItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? "0" : "10px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    marginBottom: "2px",
                    textDecoration: "none",
                    color: isActive ? "white" : "rgba(255,255,255,0.4)",
                    background: isActive ? "var(--accent-grad-soft)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--accent-edge)" : "3px solid transparent",
                    fontSize: "12.4px",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "all 0.18s ease"
                  })}
                >
                  {item.icon}
                  {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* New Report Button */}
      <div style={{ padding: "0 10px 12px", position: "relative", zIndex: 1 }}>
        <button
          title="Generate formatted PDF or Excel report"
          onMouseEnter={() => setIsNewReportHovered(true)}
          onMouseLeave={() => setIsNewReportHovered(false)}
          onFocus={() => setIsNewReportFocused(true)}
          onBlur={() => setIsNewReportFocused(false)}
          style={{
          width: "100%",
          padding: "10px",
          background: (isNewReportHovered || isNewReportFocused)
            ? "var(--accent-grad)"
            : "rgba(255,255,255,0.06)",
          border: (isNewReportHovered || isNewReportFocused)
            ? "1px solid rgba(148,163,184,0.60)"
            : "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          color: (isNewReportHovered || isNewReportFocused)
            ? "#FFF8ED"
            : "rgba(255,255,255,0.92)",
          fontSize: "12.6px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontFamily: "'Outfit', sans-serif",
          boxShadow: (isNewReportHovered || isNewReportFocused)
            ? "0 6px 14px rgba(51,65,85,0.28)"
            : "none",
          transform: (isNewReportHovered || isNewReportFocused) ? "translateY(-1px)" : "translateY(0)",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "all 0.2s ease"
        }}>
          <span style={{ fontSize: "15px" }}>+</span>{!collapsed && <span style={{ whiteSpace: "nowrap" }}> New Report</span>}
        </button>
      </div>

      {/* Bottom Items */}
      <div style={{
        padding: "10px 10px 20px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        position: "relative",
        zIndex: 1
      }}>
        {bottomItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? "0" : "10px",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: "9px 12px",
              borderRadius: "10px",
              marginBottom: "2px",
              textDecoration: "none",
              color: "rgba(255,255,255,0.4)",
              fontSize: "12.4px",
              fontFamily: "'Outfit', sans-serif",
              transition: "color 0.18s"
            }}
          >
            {item.icon}
            {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}
