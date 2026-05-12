import ReactECharts from "echarts-for-react"

export type RiskGaugeDatum = {
	departmentId: string
	departmentName: string
	riskScore: number
	riskLevel: string
}

function levelColor(level: string): string {
	switch (level) {
		case "critical":
			return "#EF4444"
		case "high":
			return "#F97316"
		case "medium":
			return "#F59E0B"
		default:
			return "#10B981"
	}
}

export default function RiskGauge({
	datum,
	onClick
}: {
	datum: RiskGaugeDatum
	onClick?: (datum: RiskGaugeDatum) => void
}) {
	const color = levelColor(datum.riskLevel)

	return (
		<div
			className={`rounded-2xl border bg-white p-4 shadow-sm ${onClick ? "cursor-pointer hover:border-gray-400 transition-colors" : ""}`}
			onClick={() => onClick?.(datum)}
		>
			<div className="mb-2 flex items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold text-gray-900">{datum.departmentName}</h3>
					<p className="text-xs text-gray-500">Risk score</p>
				</div>
				<span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ color, backgroundColor: `${color}15` }}>
					{datum.riskLevel.toUpperCase()}
				</span>
			</div>
			<ReactECharts
				style={{ height: 210 }}
				option={{
					series: [
						{
							type: "gauge",
							startAngle: 180,
							endAngle: 0,
							min: 0,
							max: 100,
							progress: { show: true, width: 16, itemStyle: { color } },
							axisLine: {
								lineStyle: {
									width: 16,
									color: [
										[0.3, "#10B981"],
										[0.6, "#FACC15"],
										[0.8, "#F97316"],
										[1, "#EF4444"]
									]
								}
							},
							splitLine: { distance: -18, length: 8, lineStyle: { color: "#CBD5E1", width: 1 } },
							axisTick: { distance: -12, length: 4, lineStyle: { color: "#CBD5E1" } },
							axisLabel: { color: "#64748B", distance: 8, fontSize: 10 },
							pointer: { itemStyle: { color } },
							detail: { valueAnimation: true, formatter: "{value}", color: "#0F172A", fontSize: 18, offsetCenter: [0, "58%"] },
							data: [{ value: Math.round(datum.riskScore), name: datum.departmentName }]
						}
					]
				}}
			/>
		</div>
	)
}