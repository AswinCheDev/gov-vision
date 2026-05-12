import cron from "node-cron"
import axios from "axios"

import { retrainModels } from "../services/mlService"

export async function runRetrainJob(): Promise<void> {
	console.log("[retrainJob] Starting weekly model retraining...")

	try {
		await retrainModels()
		console.log("[retrainJob] Model retraining triggered successfully.")

		try {
			await axios.post(
				`${process.env.MODULE2_BASE_URL}/api/internal/audit/log`,
				{
					action: "MODEL_RETRAINED",
					performedBy: "system",
					details: "Weekly retraining of Isolation Forest, Prophet, and Random Forest models."
				},
				{
					headers: {
						"x-service-key": process.env.SERVICE_KEY
					}
				}
			)
			console.log("[retrainJob] Audit log written to Module 2.")
		} catch (auditError) {
			console.error("[retrainJob] Audit logging failed:", auditError)
		}
	} catch (err) {
		console.error("[retrainJob] Retraining failed:", err)
	}
}

cron.schedule("0 3 * * 0", () => {
	runRetrainJob().catch((error) => {
		console.error("[retrainJob] Uncaught cron error:", error)
	})
})

console.log("[retrainJob] Scheduled: weekly on Sunday at 03:00.")