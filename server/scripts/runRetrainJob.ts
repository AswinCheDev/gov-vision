import dotenv from "dotenv"
import path from "path"
import { connectMongo } from "../config/db"
import { runRetrainJob } from "../jobs/retrainJob"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function main(): Promise<void> {
	await connectMongo()
	await runRetrainJob()
	console.log("Manual retrain run completed")
	process.exit(0)
}

main().catch((error) => {
	console.error("Manual retrain run failed:", error)
	process.exit(1)
})