import { Fragment, useState, useEffect } from 'react';
import { getSchedules, toggleSchedule, deleteSchedule, runScheduleNow, getScheduleHistory, downloadReport } from '../services/api';
import type { ReportSchedule } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import AddScheduleModal from '../components/AddScheduleModal';
import ReportsSubnav from '../components/ReportsSubnav';

export default function ReportSchedules() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [historyBySchedule, setHistoryBySchedule] = useState<Record<string, Array<{ runDate: string; status: string; reportId: string; filePath?: string }>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getSchedules();
      setSchedules(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id: string) {
    const updated = await toggleSchedule(id);
    setSchedules((prev) => prev.map((s) => (s._id === id ? updated : s)));
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this schedule?')) return;
    await deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s._id !== id));
  }

  async function handleRunNow(id: string) {
    setRunningScheduleId(id);
    try {
      const result = await runScheduleNow(id);
      setBanner(`Report generation started. Report ID: ${result.reportId}`);
      await load();
    } catch (error) {
      setBanner('Failed to start report generation.');
    } finally {
      setRunningScheduleId(null);
    }
  }

  async function toggleHistory(id: string) {
    setExpandedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    if (historyBySchedule[id]) return;

    try {
      const history = await getScheduleHistory(id);
      setHistoryBySchedule((prev) => ({ ...prev, [id]: history }));
    } catch {
      setHistoryBySchedule((prev) => ({ ...prev, [id]: [] }));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Outfit', sans-serif" }}>
            <span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
            <span>Reports</span><span style={{ color: "#CBD5E1" }}>›</span>
            <span style={{ color: "#374151", fontWeight: 600 }}>Scheduled Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automated report delivery. Schedules run at 6:00 AM on their due date.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          + Add Schedule
        </button>
      </div>

      <ReportsSubnav />

      {banner && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {banner}
        </div>
      )}

      {loading && <SkeletonLoader rows={3} />}

      {!loading && schedules.length === 0 && (
        <div className="bg-gray-50 rounded-xl border p-12 text-center">
          <p className="text-gray-500 text-sm">No schedules yet.</p>
          <p className="text-gray-400 text-xs mt-1">Click "Add Schedule" to create your first automated report.</p>
        </div>
      )}

      {!loading && schedules.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-gray-600"> </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Frequency</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Format</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Next Run</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <Fragment key={s._id}>
                <tr className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <button onClick={() => toggleHistory(s._id)} className="text-gray-500 hover:text-gray-800 text-sm font-bold">
                      {expandedIds.includes(s._id) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 capitalize">{s.frequency}</td>
                  <td className="px-4 py-3 uppercase text-xs">{s.reportConfig.format}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(s.nextRunAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {s.lastRunStatus && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        s.lastRunStatus === 'success' ? 'bg-green-100 text-green-800' :
                        s.lastRunStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {s.lastRunStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(s._id)}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        s.isActive ? 'bg-gray-800' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${
                        s.isActive ? 'left-5' : 'left-1'
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRunNow(s._id)}
                      disabled={runningScheduleId === s._id}
                      className="mr-3 text-gray-700 hover:text-gray-900 disabled:text-gray-400 text-xs font-medium"
                    >
                      {runningScheduleId === s._id ? 'Running...' : 'Run Now'}
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedIds.includes(s._id) && (
                  <tr key={`${s._id}-history`} className="bg-slate-50 border-b">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="rounded-xl border bg-white p-3">
                        <div className="text-sm font-semibold text-gray-800 mb-3">Recent Runs</div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-gray-500">
                              <th className="text-left py-2">Date</th>
                              <th className="text-left py-2">Status</th>
                              <th className="text-left py-2">Report ID</th>
                              <th className="text-left py-2">Download</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(historyBySchedule[s._id] || []).map((run) => (
                              <tr key={run.reportId} className="border-b last:border-0">
                                <td className="py-2">{new Date(run.runDate).toLocaleString()}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${run.status === 'completed' || run.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {run.status}
                                  </span>
                                </td>
                                <td className="py-2 text-gray-600">{run.reportId}</td>
                                <td className="py-2">
                                  <button
                                    type="button"
                                    className="text-gray-700 hover:text-gray-900 font-medium"
                                    onClick={() => downloadReport(run.reportId, `govvision-schedule-${s.name}-${run.reportId}.pdf`)}
                                  >
                                    Download
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddScheduleModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(newSchedule) => {
          setSchedules((prev) => [newSchedule, ...prev]);
          setShowAdd(false);
        }}
        initialValues={{
          reportType: 'executive_summary',
          format: 'csv',
          departments: []
        }}
      />
    </div>
  );
}
