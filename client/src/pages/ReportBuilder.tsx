import { useEffect, useState } from "react";
import {
  generateReport,
  downloadReport,
  getReportTemplates,
  saveReportTemplate,
} from "../services/api";
import type { ReportFormat, ReportType } from "../types";
import DateRangePicker from "../components/DateRangePicker";
import FormatSelector from "../components/FormatSelector";
import ReportsSubnav from "../components/ReportsSubnav";
import AddScheduleModal from "../components/AddScheduleModal";

const REPORT_TYPES: Array<{
  value: ReportType;
  label: string;
  description: string;
}> = [
  {
    value: "executive_summary",
    label: "Executive Summary",
    description: "KPI overview + anomaly count across all selected departments",
  },
  {
    value: "compliance",
    label: "Compliance Report",
    description: "Detailed compliance rates and violation breakdown",
  },
  {
    value: "anomaly",
    label: "Anomaly Report",
    description: "All detected anomalies with explicit feature values",
  },
  {
    value: "risk",
    label: "Risk Report",
    description: "Predictive risk scoring per department based on historical data",
  },
];

const DEPARTMENTS = [
  "Finance",
  "Human Resources",
  "Operations",
  "Information Technology",
  "Customer Service"
];

const today = new Date().toISOString().split("T")[0];
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

export default function ReportBuilder() {
  const [reportType, setReportType] = useState<ReportType>("executive_summary");
  const [dateFrom, setDateFrom] = useState(ninetyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [format, setFormat] = useState<ReportFormat>("csv");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(["KPI Table"]);
  const [templateName, setTemplateName] = useState("Weekly Executive Summary");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState<Array<{
    _id: string;
    name: string;
    reportType: string;
    dateFrom: string;
    dateTo: string;
    departments: string[];
    widgets: string[];
    format: string;
  }>>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getReportTemplates()
      .then((data) => setTemplates(data))
      .catch(() => setTemplates([]));
  }, []);

  function toggleDept(dept: string) {
    setSelectedDepts((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
    setGeneratedId(null);
    setSuccess(false);
  }

  function applyPreset(val: string) {
    if (!val) return;
    setGeneratedId(null);
    setSuccess(false);
    
    if (val === "all") {
      setDateFrom("2024-01-01");
      setDateTo(new Date().toISOString().split("T")[0]);
      return;
    }
    if (val === "2025") {
      setDateFrom("2025-01-01");
      setDateTo("2025-12-31");
      return;
    }
    const days = parseInt(val, 10);
    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split("T")[0];
    const from = new Date();
    from.setDate(todayObj.getDate() - days);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(todayStr);
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setGeneratedId(null);
    setSuccess(false);

    try {
      let departmentsToSend = selectedDepts;
      if (selectedDepts.length === 0) {
        departmentsToSend = ["ORG", ...DEPARTMENTS];
      }
      const result = await generateReport({
        type: reportType,
        format,
        dateFrom,
        dateTo,
        departments: departmentsToSend,
        widgets: selectedWidgets,
      });

      setGeneratedId(result.reportId);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Report generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!generatedId) return;
    const ext = format === "excel" ? "xlsx" : format;
    await downloadReport(generatedId, `govvision-report-${reportType}.${ext}`);
  }

  async function handleSaveTemplate() {
    setError(null);
    setTemplateMessage(null);
    setSavingTemplate(true);
    try {
      await saveReportTemplate({
        name: templateName.trim() || "Untitled Template",
        reportType,
        dateFrom,
        dateTo,
        departments: selectedDepts,
        widgets: selectedWidgets,
        format,
      });
      setTemplateMessage("Template saved successfully.");
      setTimeout(() => setTemplateMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = templates.find((item) => item._id === templateId);
    if (!template) return;

    setTemplateName(template.name);
    setReportType(template.reportType as ReportType);
    setDateFrom(template.dateFrom);
    setDateTo(template.dateTo);
    setSelectedDepts(template.departments || []);
    setSelectedWidgets(template.widgets || []);
    setFormat(template.format as ReportFormat);
    setGeneratedId(null);
    setSuccess(false);
  }

  const estimatedDays = Math.max(1, Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedDecisions = Math.round((5000 / DEPARTMENTS.length) * Math.max(1, selectedDepts.length || DEPARTMENTS.length) / 365 * estimatedDays);

  function toggleWidget(widget: string) {
    setSelectedWidgets((prev) =>
      prev.includes(widget) ? prev.filter((item) => item !== widget) : [...prev, widget],
    );
    setGeneratedId(null);
    setSuccess(false);
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Outfit', sans-serif" }}>
          <span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
          <span>Reports</span><span style={{ color: "#CBD5E1" }}>›</span>
          <span style={{ color: "#374151", fontWeight: 600 }}>Report Builder</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and generate governance reports in CSV, Excel, or PDF format.
        </p>
      </div>

      <div className="mb-8">
        <ReportsSubnav />
      </div>

      {templateMessage && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {templateMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Left Column */}
        <div className="flex-[2] space-y-8">
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">Report Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={`cursor-pointer border rounded-xl p-4 transition-all ${
                    reportType === rt.value
                      ? "border-gray-700 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name="reportType"
                      value={rt.value}
                      checked={reportType === rt.value}
                      onChange={() => {
                        setReportType(rt.value);
                        setGeneratedId(null);
                      }}
                      className="accent-gray-800"
                    />
                    <span className="font-semibold text-sm text-gray-800">{rt.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-5">{rt.description}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">Include Widgets</h2>
            <div className="flex flex-wrap gap-2">
              {["KPI Table", "Compliance Chart", "Anomaly List", "Risk Scores", "Decision Volume"].map((widget) => (
                <button
                  key={widget}
                  type="button"
                  onClick={() => toggleWidget(widget)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedWidgets.includes(widget)
                      ? "border-gray-800 bg-gray-800 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {widget}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Date Range</h2>
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-gray-50 outline-none cursor-pointer hover:border-gray-300 transition-colors"
                onChange={(e) => applyPreset(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select...</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="2025">2025</option>
                <option value="all">All Data</option>
              </select>
            </div>
            <DateRangePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onFromChange={setDateFrom}
              onToChange={setDateTo}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Departments</h2>
              <span className="text-xs text-gray-400">
                {selectedDepts.length === 0 ? "All departments selected" : `${selectedDepts.length} selected`}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedDepts([]);
                setGeneratedId(null);
                setSuccess(false);
              }}
              className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedDepts.length === 0
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              Organization Wide
            </button>
            <div className="flex flex-wrap gap-2 pt-1">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => toggleDept(dept)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                    selectedDepts.length > 0 && selectedDepts.includes(dept)
                      ? "bg-gray-800 text-white border-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">Leave all unselected to include all departments in the report.</p>
            <p className="text-xs text-gray-500">
              Estimated: ~{estimatedDecisions} decisions · {selectedDepts.length === 0 ? DEPARTMENTS.length : selectedDepts.length} departments · {estimatedDays} days
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-[320px] max-w-[400px] space-y-8">
          {/* Section: Templates */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Template Configuration</h2>
            <div style={{ 
              display: "inline-flex", 
              gap: "16px", 
              background: "#F8FAFC", 
              border: "1px solid #E2E8F0", 
              borderRadius: "16px", 
              padding: "20px",
              whiteSpace: "nowrap",
              minWidth: "100%"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px" }}>Load Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  style={{
                    width: "200px", borderRadius: "12px", border: "1px solid #E2E8F0",
                    background: "white", padding: "10px 12px", fontSize: "13px",
                    fontWeight: 600, color: "#334155", outline: "none"
                  }}
                >
                  <option value="">Choose template...</option>
                  {templates.map((template) => (
                    <option key={template._id} value={template._id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "10px", fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "1px" }}>Template Name</label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  style={{
                    width: "220px", borderRadius: "12px", border: "1px solid #E2E8F0",
                    background: "white", padding: "10px 12px", fontSize: "13px",
                    fontWeight: 600, color: "#334155", outline: "none"
                  }}
                  placeholder="Name..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-semibold text-gray-800">Output Format</h2>
            <FormatSelector
              selected={format}
              onChange={(f) => {
                setFormat(f);
                setGeneratedId(null);
              }}
            />
          </div>

          <div className="space-y-4 pt-2">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && generatedId && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-gray-800 font-semibold text-sm">Report generated successfully</p>
                  <p className="text-gray-500 text-xs mt-0.5">Click Download to save the file</p>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center"
                >
                  ↓ Download {format.toUpperCase()}
                </button>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full border-2 border-gray-800 text-gray-800 bg-white hover:bg-gray-800 hover:text-white active:bg-gray-900 disabled:opacity-50 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? "Generating report..." : "Generate Report"}
            </button>

            <button
              onClick={() => {
                console.log("[ReportBuilder] Save Template clicked");
                void handleSaveTemplate();
              }}
              disabled={savingTemplate}
              className="w-full border border-gray-300 bg-white text-gray-700 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-gray-200 active:bg-gray-300 active:scale-[0.98] cursor-pointer"
            >
              {savingTemplate ? "Saving template..." : "Save as Template"}
            </button>

            <button
              onClick={() => {
                console.log("[ReportBuilder] Schedule Report clicked");
                setShowScheduleModal(true);
              }}
              className="w-full border border-gray-300 bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-gray-200 active:bg-gray-300 active:scale-[0.98] cursor-pointer"
            >
              Schedule This Report
            </button>
          </div>
        </div>
      </div>

      <AddScheduleModal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onCreated={(schedule) => setShowScheduleModal(false)}
        initialValues={{
          reportType,
          format,
          departments: selectedDepts,
          dateRange: dateFrom === "2024-01-01" ? "last_90_days" : undefined,
        }}
      />
    </div>
  );
}
