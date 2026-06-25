import nodemailer from "nodemailer"
import jwt from "jsonwebtoken"

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT) || 2525,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS
	}
})

/** Generate a short-lived signed token for email download links (24 hours) */
export function generateDownloadToken(reportId: string): string {
	return jwt.sign(
		{ reportId, type: "download" },
		process.env.JWT_SECRET || "secret",
		{ expiresIn: "24h" }
	)
}

export async function sendReportEmail(
	recipients: string[],
	reportName: string,
	baseUrl: string,
	reportId: string
): Promise<void> {
	if (recipients.length === 0) return

	const token = generateDownloadToken(reportId)
	const downloadUrl = `${baseUrl}/api/reports/${reportId}/download-public?token=${token}`
	const now = new Date()
	const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000)
	const expiryStr = expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

	await transporter.sendMail({
		from: `"GovVision Reports" <${process.env.SMTP_USER}>`,
		to: recipients.join(", "),
		subject: `Your GovVision Report is Ready: ${reportName}`,
		html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>GovVision Report Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A1F2E 0%,#2D3561 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;letter-spacing:3px;color:#8B9EBF;text-transform:uppercase;font-weight:600;">GovVision</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:40px;">

              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Report Name</p>
              <p style="margin:0 0 28px;font-size:20px;font-weight:700;color:#1A1F2E;">${reportName}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E5EAF5;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="8">
                      <tr>
                        <td style="font-size:13px;color:#6B7280;width:140px;padding:4px 0;">Status</td>
                        <td style="font-size:13px;color:#16A34A;font-weight:600;padding:4px 0;">
                          <span style="display:inline-block;background:#DCFCE7;color:#16A34A;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;">✓ Completed</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6B7280;padding:4px 0;">Generated</td>
                        <td style="font-size:13px;color:#1A1F2E;font-weight:500;padding:4px 0;">${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6B7280;padding:4px 0;">Link Expires</td>
                        <td style="font-size:13px;color:#1A1F2E;font-weight:500;padding:4px 0;">${expiryStr}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;">Your scheduled governance report has been successfully generated and is available for download. Click the button below to access your file.</p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#1A1F2E,#2D3561);color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">
                      ↓ &nbsp; Download Report
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;text-align:center;">If the button does not work, please log in to GovVision and access your report from the Report History page.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F1F4FA;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">This is an automated message from <strong style="color:#1A1F2E;">GovVision Analytics</strong>. Please do not reply to this email.</p>
              <p style="margin:6px 0 0;font-size:11px;color:#C4C9D4;">© ${now.getFullYear()} GovVision. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
		`
	})
}