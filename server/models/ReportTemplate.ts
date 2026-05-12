import mongoose, { Schema, Document } from "mongoose"

export interface IReportTemplate extends Document {
	name: string
	reportType: "executive_summary" | "compliance" | "anomaly" | "risk"
	dateFrom: string
	dateTo: string
	departments: string[]
	widgets: string[]
	format: "csv" | "excel" | "pdf"
	createdBy: string
}

const ReportTemplateSchema = new Schema(
	{
		name: { type: String, required: true },
		reportType: { type: String, enum: ["executive_summary", "compliance", "anomaly", "risk"], required: true },
		dateFrom: { type: String, required: true },
		dateTo: { type: String, required: true },
		departments: [{ type: String }],
		widgets: [{ type: String }],
		format: { type: String, enum: ["csv", "excel", "pdf"], required: true },
		createdBy: { type: String, default: "unknown" }
	},
	{ collection: "m3_report_templates", timestamps: true }
)

export default mongoose.model<IReportTemplate>("m3_report_templates", ReportTemplateSchema)