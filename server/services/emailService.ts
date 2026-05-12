import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 587,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS
	}
})

export async function sendReportEmail(
	recipients: string[],
	reportName: string,
	downloadUrl: string
): Promise<void> {
	if (recipients.length === 0) {
		return
	}

	await transporter.sendMail({
		from: `"GovVision Reports" <${process.env.SMTP_USER}>`,
		to: recipients.join(", "),
		subject: `GovVision Report Ready: ${reportName}`,
		html: `
			<h2>${reportName} is ready</h2>
			<p>Your scheduled report has been generated.</p>
			<a href="${downloadUrl}" style="background:#1A1F2E;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">
				Download Report
			</a>
			<p style="color:#888;font-size:12px;">This link expires in 24 hours.</p>
		`
	})
}