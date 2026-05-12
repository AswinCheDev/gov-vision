import { Navigate, Route, Routes } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import ForecastPage from "./pages/ForecastPage"
import RiskPage from "./pages/RiskPage"
import ReportBuilder from "./pages/ReportBuilder"
import ReportHistory from "./pages/ReportHistory"
import ReportSchedules from "./pages/ReportSchedules"
import AppLayout from "./components/AppLayout"
import PlaceholderPage from "./pages/PlaceholderPage"
import AnomalyDetectionPage from "./pages/AnomalyDetection"
import LoginPage from "./pages/LoginPage"
import ProtectedRoute from "./components/ProtectedRoute"
import DecisionAnalytics from "./pages/DecisionAnalytics"
import ComplianceAnalytics from "./pages/ComplianceAnalytics"
import DepartmentPerformance from "./pages/DepartmentPerformance"
import KPIConfigPage from "./pages/KPIConfig"
import AIInsightsPanel from "./pages/AIInsightsPanel"
function UnauthorizedPage() {
  return (
    <div style={{ padding: "32px", fontFamily: "var(--font-sans)" }}>
      You do not have access to this page.
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/anomaly" element={<AnomalyDetectionPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/analytics/forecast" element={<ForecastPage />} />
          <Route path="/analytics/decisions" element={<DecisionAnalytics />} />
          <Route path="/analytics/compliance" element={<ComplianceAnalytics />} />
          <Route path="/analytics/departments" element={<DepartmentPerformance />} />
          <Route path="/ai/insights" element={<AIInsightsPanel />} />
          <Route path="/anomaly/deep/:id?" element={<Navigate to="/anomaly" replace />} />
          <Route path="/risk" element={<RiskPage />} />
          <Route path="/reports/builder" element={<ReportBuilder />} />
          <Route path="/reports/history" element={<ReportHistory />} />
          <Route path="/reports/schedules" element={<ReportSchedules />} />
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/kpi-config" element={<KPIConfigPage />} />
          </Route>
          <Route path="/reports" element={<Navigate to="/reports/builder" replace />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="/support" element={<PlaceholderPage title="Support" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
