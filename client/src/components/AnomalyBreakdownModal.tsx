import type { IAnomaly, Severity } from "../types"
import { RISK_LEVEL_THEME } from "../types"
import { getDepartmentColor } from "../utils/departmentColors"

interface Props {
  severity: Severity
  anomalies: IAnomaly[]
  onClose: () => void
}

export default function AnomalyBreakdownModal({ severity, anomalies, onClose }: Props) {
  if (!anomalies) return null

  // Group by department
  const deptCounts = anomalies.reduce((acc, a) => {
    acc[a.department] = (acc[a.department] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const deptData = Object.entries(deptCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: ((count / anomalies.length) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)

  const theme = RISK_LEVEL_THEME[severity === "Normal" ? "Low" : severity] || RISK_LEVEL_THEME.Low

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ background: `linear-gradient(135deg, white 0%, ${theme.bg} 100%)` }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.fill }} />
              <h2 className="text-xl font-extrabold text-gray-900">{severity} Anomalies</h2>
            </div>
            <p className="text-sm text-gray-500 font-medium">Distribution across {deptData.length} departments · {anomalies.length} total</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors text-xl font-light"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Department Breakdown</h3>
            <div className="space-y-4">
              {deptData.map((dept, index) => (
                <div key={dept.name} className="space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-700">{dept.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-900">{dept.count}</span>
                      <span className="text-gray-400 text-xs font-medium">({dept.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${dept.percentage}%`,
                        backgroundColor: getDepartmentColor(dept.name)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Detections</h3>
            <div className="space-y-2">
              {anomalies.slice(0, 5).map((a) => (
                <div key={a._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">#{a.decisionId || "N/A"}</span>
                    <span className="text-xs text-gray-500">{a.description.slice(0, 50)}...</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-900" style={{ color: theme.text }}>
                      {(a.anomalyScore * 100).toFixed(1)}% Score
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                      {a.detectedAt ? new Date(a.detectedAt).toLocaleDateString() : "Today"}
                    </div>
                  </div>
                </div>
              ))}
              {anomalies.length > 5 && (
                <p className="text-center text-[11px] text-gray-400 font-medium pt-2">
                  + {anomalies.length - 5} more anomalies in this category
                </p>
              )}
            </div>
          </section>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex justify-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: theme.fill }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
