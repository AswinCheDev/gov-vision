import { Router, Request, Response } from "express"
import path from "path"
import fs from "fs"
import { generateReport, ReportConfig } from "../services/reportGenerator"
import Report from "../models/Report"
import ReportSchedule from "../models/ReportSchedule"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

router.post(
	"/generate",
	validateJWT,
	requireRole(["admin", "manager", "executive", "analyst"]),
	async (req: Request, res: Response) => {
		try {
			const config: ReportConfig = {
				type: req.body.type || "executive_summary",
				format: req.body.format || "csv",
				dateFrom: req.body.dateFrom || "2026-01-01",
				dateTo: req.body.dateTo || new Date().toISOString().split("T")[0],
				departments: Array.isArray(req.body.departments) ? req.body.departments : [],
				widgets: Array.isArray(req.body.widgets) ? req.body.widgets : ["KPI Table"],
				requestedBy: req.user?.userId || "unknown",
			}

			const filePath = await generateReport(config)

			const reportRecord = await Report.create({
				type: config.type,
				format: config.format,
				status: "completed",
				filePath,
				parameters: config,
				generatedBy: config.requestedBy,
				generatedAt: new Date(),
			})

			return res.json({ reportId: reportRecord._id, status: "completed" })
		} catch (err: any) {
			console.error("[ReportAPI] Generation failed:", err.message)
			return res.status(500).json({ error: `Report generation failed: ${err.message}` })
		}
	}
)

import { sendReportEmail } from "../services/emailService"
import { getAppBaseUrl } from "../utils/reportHelpers"
import jwt from "jsonwebtoken"

router.post(
	"/schedules/:id/run",
	validateJWT,
	requireRole(["admin", "manager", "analyst", "executive"]),
	async (req: Request, res: Response) => {
		try {
			const schedule = await ReportSchedule.findById(req.params.id)
			if (!schedule) {
				return res.status(404).json({ error: "Schedule not found" })
			}

			const today = new Date()
			const days = schedule.reportConfig?.dateRangeMode === "last_7_days"
				? 7
				: schedule.reportConfig?.dateRangeMode === "last_30_days"
					? 30
					: 90
			const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)

			const filePath = await generateReport({
				type: schedule.reportConfig?.type as ReportConfig["type"],
				format: schedule.reportConfig?.format as ReportConfig["format"],
				dateFrom: from.toISOString().split("T")[0],
				dateTo: today.toISOString().split("T")[0],
				departments: schedule.reportConfig?.departments || [],
				widgets: schedule.reportConfig?.widgets || ["KPI Table"],
				requestedBy: req.user?.userId || "unknown"
			})

			const report = await Report.create({
				type: schedule.reportConfig?.type,
				format: schedule.reportConfig?.format,
				status: "completed",
				filePath,
				scheduleId: String(schedule._id),
				parameters: {
					type: schedule.reportConfig?.type,
					format: schedule.reportConfig?.format,
					dateFrom: from.toISOString().split("T")[0],
					dateTo: today.toISOString().split("T")[0],
					departments: schedule.reportConfig?.departments || [],
					requestedBy: req.user?.userId || "unknown"
				},
				generatedBy: req.user?.userId || "unknown",
				generatedAt: new Date()
			})

			// Update schedule status
			schedule.lastRunAt = new Date()
			schedule.lastRunStatus = "success"
			await schedule.save()

			// Send the notification email (non-blocking)
			if (schedule.recipients && schedule.recipients.length > 0) {
				try {
					await sendReportEmail(
						schedule.recipients,
						schedule.name,
						getAppBaseUrl(req),
						String(report._id)
					)
				} catch (emailErr: any) {
					console.error("[ReportAPI] Email delivery failed:", emailErr.message)
				}
			}

			return res.json({ reportId: report._id, status: "success" })
		} catch (err: any) {
			console.error("[ReportAPI] Run Now failed:", err.message)
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/schedules/:id/history",
	validateJWT,
	async (req: Request, res: Response) => {
		try {
			const runs = await Report.find({ scheduleId: req.params.id })
				.sort({ createdAt: -1 })
				.limit(10)
				.lean()

			return res.json(runs.map((run) => ({
				runDate: run.generatedAt,
				status: run.status,
				reportId: String(run._id),
				filePath: run.filePath
			})))
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/",
	validateJWT,
	requireRole(["admin", "manager", "executive", "analyst"]),
	async (_req: Request, res: Response) => {
		try {
			const reports = await Report.find().sort({ generatedAt: -1 }).lean()
			return res.json(reports)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/:id/download",
	validateJWT,
	async (req: Request, res: Response) => {
		try {
			const report = await Report.findById(req.params.id)
			if (!report) {
				return res.status(404).json({ error: "Report not found" })
			}

			if (!fs.existsSync(report.filePath)) {
				return res.status(404).json({ error: "Report file not found on disk" })
			}

			const filename = path.basename(report.filePath)
			return res.download(report.filePath, filename)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

// Public download route — validates a signed download token from the URL query string
// This allows download links in emails to work without a browser JWT
router.get(
	"/:id/download-public",
	async (req: Request, res: Response) => {
		try {
			const { token } = req.query
			if (!token) return res.status(401).json({ error: "No token provided" })

			const decoded = jwt.verify(
				token as string,
				process.env.JWT_SECRET || "secret"
			) as { reportId: string; type: string }

			if (decoded.type !== "download" || decoded.reportId !== req.params.id) {
				return res.status(403).json({ error: "Invalid download token" })
			}

			const report = await Report.findById(req.params.id)
			if (!report) return res.status(404).json({ error: "Report not found" })
			if (!fs.existsSync(report.filePath)) return res.status(404).json({ error: "File not found on disk" })

			const filename = path.basename(report.filePath)
			return res.download(report.filePath, filename)
		} catch (err: any) {
			return res.status(401).json({ error: "Token expired or invalid" })
		}
	}
)

router.post(
	"/schedules",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			const { name, reportConfig, frequency, recipients } = req.body

			const tomorrow = new Date()
			tomorrow.setDate(tomorrow.getDate() + 1)
			tomorrow.setHours(6, 0, 0, 0)

			const schedule = await ReportSchedule.create({
				name,
				reportConfig,
				frequency,
				nextRunAt: tomorrow,
				createdBy: req.user?.userId || "unknown",
				recipients: recipients || [],
			})

			return res.status(201).json(schedule)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.get(
	"/schedules",
	validateJWT,
	async (_req: Request, res: Response) => {
		try {
			const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean()
			return res.json(schedules)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.patch(
	"/schedules/:id/toggle",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			const schedule = await ReportSchedule.findById(req.params.id)
			if (!schedule) return res.status(404).json({ error: "Not found" })

			schedule.isActive = !schedule.isActive
			await schedule.save()
			return res.json(schedule)
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

router.delete(
	"/schedules/:id",
	validateJWT,
	requireRole(["admin", "manager"]),
	async (req: Request, res: Response) => {
		try {
			await ReportSchedule.findByIdAndDelete(req.params.id)
			return res.json({ deleted: true })
		} catch (err: any) {
			return res.status(500).json({ error: err.message })
		}
	}
)

export default router
