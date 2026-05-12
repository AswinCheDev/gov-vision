import { Router, Request, Response } from "express"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"
import ReportTemplate from "../models/ReportTemplate"

const router = Router()

router.post(
	"/templates",
	validateJWT,
	requireRole(["admin", "manager", "analyst"]),
	async (req: Request, res: Response) => {
		try {
			const template = await ReportTemplate.create({
				name: String(req.body.name || "Untitled Template"),
				reportType: req.body.reportType || "executive_summary",
				dateFrom: req.body.dateFrom || new Date().toISOString().split("T")[0],
				dateTo: req.body.dateTo || new Date().toISOString().split("T")[0],
				departments: Array.isArray(req.body.departments) ? req.body.departments : [],
				widgets: Array.isArray(req.body.widgets) ? req.body.widgets : [],
				format: req.body.format || "csv",
				createdBy: req.user?.userId || "unknown"
			})

			return res.status(201).json(template)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/templates",
	validateJWT,
	requireRole(["admin", "manager", "analyst"]),
	async (_req: Request, res: Response) => {
		try {
			const templates = await ReportTemplate.find().sort({ createdAt: -1 }).lean()
			return res.json(templates)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

export default router