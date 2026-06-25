import { useEffect, useState } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import { acknowledgeAnomaly, getAnomalies } from "../services/api"
import ForecastPage from "./ForecastPage"
import RiskGauge, { type RiskGaugeDatum } from "../components/RiskGauge"
import SkeletonLoader from "../components/SkeletonLoader"
import FeatureBreakdownModal from "../components/FeatureBreakdownModal"

type ModelStatus = {
	modelName: string
	lastTrained: string
	confidence: number | null
}

const apiHost = window.location.hostname || "localhost"
const apiProtocol = window.location.protocol
const apiPort = import.meta.env.VITE_API_PORT || "5002"
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${apiProtocol}//${apiHost}:${apiPort}`

function getStoredToken(): string {
	return localStorage.getItem("token") || localStorage.getItem("govvision_token") || localStorage.getItem("jwt") || ""
}

export default function AIInsightsPanel() {
	const [anomalies, setAnomalies] = useState<any[]>([])
	const [riskScores, setRiskScores] = useState<RiskGaugeDatum[]>([])
	const [modelStatus, setModelStatus] = useState<ModelStatus[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedRisk, setSelectedRisk] = useState<any | null>(null)

	useEffect(() => {
		async function load() {
			setLoading(true)
			setError(null)
			try {
				const headers = getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}
				const [riskResponse, modelResponse] = await Promise.all([
					axios.get(`${apiBaseUrl}/api/ai/risk-scores`, { headers }),
					axios.get(`${apiBaseUrl}/api/ai/model-status`, { headers })
				])

				const anomalyRows = await getAnomalies()
				setAnomalies(anomalyRows)
				setRiskScores(Array.isArray(riskResponse.data) ? riskResponse.data : [])
				setModelStatus(Array.isArray(modelResponse.data) ? modelResponse.data : [])
			} catch (fetchError: any) {
				setError(fetchError?.response?.data?.error || "Failed to load data. Please try again.")
			} finally {
				setLoading(false)
			}
		}

		load()
	}, [])

	return (
		<div className="p-6 space-y-6">
			<div>
				<div style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px", fontFamily: "'Outfit', sans-serif" }}>
					<span>Home</span><span style={{ color: "#CBD5E1" }}>›</span>
					<span>Admin</span><span style={{ color: "#CBD5E1" }}>›</span>
					<span style={{ color: "#374151", fontWeight: 600 }}>AI/ML Insights</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900">AI/ML Insights</h1>
				<p className="text-sm text-gray-500 mt-1">Unified anomaly, forecast, risk, and model status view.</p>
			</div>

			{loading && <SkeletonLoader rows={4} />}
			{error && !loading && <div className="rounded-xl border bg-red-50 p-4 text-sm text-red-700">{error}</div>}

			{!loading && !error && (
				<>
					<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
						<div className="lg:col-span-2 rounded-2xl border bg-white p-4 shadow-sm min-h-[520px] flex flex-col">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<h2 className="text-lg font-semibold text-gray-900">Isolation Forest Anomalies</h2>
									<p className="text-sm text-gray-500">Active anomalies with direct links into deep insights.</p>
								</div>
								<span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{anomalies.length} active</span>
							</div>
							<div className="flex-1 space-y-3 overflow-auto pr-1">
								{anomalies.length === 0 ? (
									<div className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No active anomalies detected.</div>
								) : (
									anomalies.map((anomaly) => (
										<div key={anomaly._id} className="rounded-xl border p-4 shadow-sm">
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{anomaly.severity}</div>
													<div className="mt-1 text-sm font-medium text-gray-900">{anomaly.description || `Decision ${anomaly.decisionId} requires review.`}</div>
													<div className="mt-1 text-xs text-gray-500">{anomaly.department || "Unknown department"}</div>
												</div>
												<div className="flex flex-col items-end gap-2">
													<Link className="text-xs font-semibold text-blue-600 hover:text-blue-800" to={`/anomaly/deep/${anomaly.decisionId}`}>
														View Decision →
													</Link>
													<button
														type="button"
														onClick={async () => {
															await acknowledgeAnomaly(anomaly._id)
															setAnomalies((prev) => prev.filter((item) => item._id !== anomaly._id))
														}}
														className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
													>
														Acknowledge
													</button>
												</div>
											</div>
										</div>
									))
								)}
							</div>
						</div>
						<div className="lg:col-span-3 rounded-2xl border bg-white p-4 shadow-sm overflow-hidden">
							<div className="mb-3">
								<h2 className="text-lg font-semibold text-gray-900">Predictive Delay Forecast</h2>
								<p className="text-sm text-gray-500">Current forecast view re-used from the forecast page.</p>
							</div>
							<ForecastPage />
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
						{riskScores.map((datum) => (
							<RiskGauge
								key={datum.departmentId}
								datum={datum}
								onClick={(selected) => {
									setSelectedRisk({
										department: selected.departmentName,
										riskScore: selected.riskScore,
										riskLevel: selected.riskLevel,
										Low: 0,
										Medium: 0,
										High: 0,
										Critical: 0,
										featureImportance: null
									})
								}}
							/>
						))}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{modelStatus.map((model) => (
							<div key={model.modelName} className="rounded-2xl border bg-white p-4 shadow-sm">
								<div className="text-sm font-semibold text-gray-900">{model.modelName}</div>
								<div className="mt-2 text-xs text-gray-500">Last trained</div>
								<div className="text-sm text-gray-700">{new Date(model.lastTrained).toLocaleString()}</div>
								<div className="mt-3 text-xs text-gray-500">Confidence</div>
								<div className="text-sm font-medium text-gray-900">{model.confidence == null ? "N/A" : `${model.confidence}%`}</div>
							</div>
						))}
					</div>

					<FeatureBreakdownModal
						entry={selectedRisk}
						onClose={() => setSelectedRisk(null)}
					/>
				</>
			)}
		</div>
	)
}