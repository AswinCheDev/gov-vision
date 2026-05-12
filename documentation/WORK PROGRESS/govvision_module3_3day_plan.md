# GovVision Module 3 — 3-Day Implementation Plan

> **Scope:** Everything remaining to complete Module 3 to full spec.
> **Based on:** `progress1_2.md` (current state) vs `MODULE_3.md` (full spec).
> **Stack:** React + TypeScript (client) · Node.js + Express + TypeScript (server) · Python FastAPI (ml_service)

---

## Overview — What Gets Done Each Day

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Auth + Security + 4 Missing Pages | Login page, role gates, JWT enforcement, Decision Analytics, Compliance Analytics, Department Performance, KPI Config |
| Day 2 | Backend completion + AI/ML Insights Panel + Report enhancements | retrainJob, Nodemailer, Module 2 integration, AI/ML Insights Panel, Report Builder upgrades |
| Day 3 | UI polish + Testing + DevOps | Dashboard enhancements, Redis verification, DeepInsights routing, test coverage, CI/CD |

---

---

# DAY 1 — Auth, Security, and 4 Missing Frontend Pages

**Goal:** Lock down authentication, enforce JWT on all routes, and build the four pages that do not exist yet.

---

## BLOCK 1.1 — Remove Dev Bypass and Enforce JWT (Server)

**Files:** `server/middleware/validateJWT.ts` · `server/routes/analyticsRoutes.ts` · `server/routes/aiRoutes.ts`

### Steps

1. **Open `server/middleware/validateJWT.ts`.**
   - Locate the dev fallback block that reads the `x-test-role` header and short-circuits JWT verification.
   - Delete the entire `if (req.headers['x-test-role'])` block.
   - The middleware must now always call `jwt.verify(token, process.env.JWT_SECRET)` with no bypass path.
   - If `JWT_SECRET` is missing from `.env`, throw a startup error early in `server/index.ts` using `if (!process.env.JWT_SECRET) throw new Error(...)`.

2. **Open `server/routes/analyticsRoutes.ts`.**
   - Every `GET` route currently has `validateJWT` commented out.
   - Uncomment `validateJWT` on every route: `kpi-summary`, `kpi-summary/:deptId`, `decision-volume`, `cycle-time-histogram`, `compliance-trend`, `risk-heatmap`, `forecast`.
   - Add `requireRole(['admin','manager','analyst'])` after `validateJWT` on each route.

3. **Open `server/routes/aiRoutes.ts`.**
   - Confirm `validateJWT` + `requireRole` are active on both `GET /api/ai/anomalies` and `PUT /api/ai/anomalies/:id/acknowledge`.
   - Verify the exec denial logic (`role === 'executive'` returns 403 on anomaly list) is still in place.

4. **Test:** Start the server, hit `GET /api/analytics/kpi-summary` with no token → expect `401`. Hit with a valid JWT for role `manager` → expect `200`.

---

## BLOCK 1.2 — Add Production Security (Server)

**Files:** `server/index.ts` · `server/middleware/` (new file `rateLimiter.ts`)

### Steps

1. **Install `express-rate-limit`:**
   ```bash
   cd server && npm install express-rate-limit
   npm install --save-dev @types/express-rate-limit
   ```

2. **Create `server/middleware/rateLimiter.ts`:**
   ```ts
   import rateLimit from 'express-rate-limit';
   export const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 200,
     standardHeaders: true,
     legacyHeaders: false,
     message: { error: 'Too many requests, please try again later.' }
   });
   export const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 20,
     message: { error: 'Too many login attempts.' }
   });
   ```

3. **Open `server/index.ts`:**
   - Import `apiLimiter` and `authLimiter`.
   - Apply `apiLimiter` globally: `app.use('/api', apiLimiter)`.
   - Apply `authLimiter` specifically: `app.use('/api/auth', authLimiter)`.
   - Update CORS config: replace the wildcard localhost/127.0.0.1 rule with an explicit `allowedOrigins` array read from `process.env.ALLOWED_ORIGINS` (comma-separated). In `.env`, set `ALLOWED_ORIGINS=http://localhost:5173`.
   - Confirm `helmet()` is already applied (it is per progress doc). If not, add `app.use(helmet())`.

4. **HTTPS note:** For local dev, HTTPS is not required. Add a comment block in `server/index.ts` noting that production deployment must terminate TLS at the reverse proxy (nginx/caddy) layer, not in Node.

---

## BLOCK 1.3 — Auth Backend (Login Endpoint + JWT Issuance)

**Files:** `server/routes/authRoutes.ts` (new) · `server/models/User.ts` (new or verify existing)

### Steps

1. **Create `server/models/User.ts`** (if not already present):
   ```ts
   import mongoose, { Schema, Document } from 'mongoose';
   export interface IUser extends Document {
     email: string;
     passwordHash: string;
     role: 'admin' | 'manager' | 'analyst' | 'executive';
     department: string;
   }
   const UserSchema = new Schema<IUser>({
     email: { type: String, required: true, unique: true, lowercase: true },
     passwordHash: { type: String, required: true },
     role: { type: String, enum: ['admin','manager','analyst','executive'], required: true },
     department: { type: String, required: true }
   }, { timestamps: true });
   export default mongoose.model<IUser>('User', UserSchema);
   ```

2. **Create `server/routes/authRoutes.ts`:**
   - `POST /api/auth/login`: reads `{ email, password }` from body, finds user by email, calls `bcrypt.compare(password, user.passwordHash)`, on success signs a JWT with `{ userId, role, department }` and `expiresIn: '15m'`, returns `{ accessToken }`.
   - `POST /api/auth/register` (admin only): accepts `{ email, password, role, department }`, hashes password with `bcrypt.hash(password, 12)`, saves user. Protected by `validateJWT + requireRole(['admin'])`.

3. **Register route in `server/index.ts`:**
   ```ts
   import authRoutes from './routes/authRoutes';
   app.use('/api/auth', authRoutes);
   ```

4. **Create a seed script `server/scripts/seedAdminUser.ts`** so there is at least one admin account to log in with during development:
   ```ts
   // Creates: email: admin@govvision.local  password: Admin1234!  role: admin
   ```
   Run once: `npx ts-node scripts/seedAdminUser.ts`.

---

## BLOCK 1.4 — Login Page (Client)

**File:** `client/src/pages/LoginPage.tsx` · `client/src/App.tsx` · `client/src/utils/auth.ts`

### Steps

1. **Create `client/src/utils/auth.ts`:**
   - `saveToken(token: string)` — saves JWT to `localStorage`.
   - `getToken()` — returns token or null.
   - `clearToken()` — removes token (logout).
   - `decodeToken()` — parses the JWT payload to extract `{ userId, role, department }`.

2. **Create `client/src/pages/LoginPage.tsx`:**
   - Full-screen centered card layout using existing TailwindCSS design tokens (background `#F5F6FA`, card white, sidebar dark `#1A1F2E` for button).
   - Fields: `email` (text input), `password` (password input).
   - On submit: `POST /api/auth/login` with axios, saves returned `accessToken` via `saveToken()`, then `navigate('/dashboard')`.
   - Error state: show inline red message on 401 ("Invalid email or password").
   - Loading state: disable button and show spinner during request.
   - No sidebar or topbar — this is a standalone page.

3. **Create `client/src/components/ProtectedRoute.tsx`:**
   ```tsx
   // Wraps a route. If no token exists, redirects to /login.
   // Optionally accepts allowedRoles prop and redirects to /unauthorized if role doesn't match.
   ```

4. **Update `client/src/App.tsx`:**
   - Add route: `/login` → `LoginPage` (no layout wrapper).
   - Add route: `/unauthorized` → simple inline message "You do not have access to this page."
   - Wrap all existing routes (`/dashboard`, `/anomaly`, `/forecast`, `/risk`, `/reports/*`) inside `<ProtectedRoute>`.

5. **Update axios base config** (`client/src/api/axios.ts` or wherever axios is configured):
   - Add request interceptor: reads `getToken()` and injects `Authorization: Bearer <token>` header on every request.
   - Add response interceptor: on `401`, calls `clearToken()` and redirects to `/login`.
   - Remove the `x-test-role` dev header injection entirely.

---

## BLOCK 1.5 — PAGE: Decision Analytics

**File:** `client/src/pages/DecisionAnalytics.tsx`
**Route:** `/analytics/decisions`

### What this page shows (per spec)
Decision volume over time, cycle time distribution, approval/rejection rates by decision type, status funnel, rejection reasons pie chart, category filter, export PNG per chart.

### Steps

1. **Create `client/src/pages/DecisionAnalytics.tsx`.**

2. **Top section — Filters bar:**
   - Department dropdown (reuse `DateRangePicker` and department dropdown from Dashboard).
   - Category filter dropdown (values: all decision types available in `m1_decisions`).
   - Date range picker using existing `DateRangePicker.tsx`.
   - Granularity toggle buttons: `Daily | Weekly | Monthly` (controlled state, passed as query param to API).

3. **Chart 1 — Decision Volume Chart (Recharts):**
   - Use existing `DecisionVolumeChart.tsx` from `components/charts/`.
   - Add a Bar/Line toggle button above the chart (controlled with local state `chartType: 'bar' | 'line'`).
   - Pass `granularity` state as a prop so the chart re-fetches with `?granularity=daily|weekly|monthly`.
   - Add an "Export PNG" button: use `html2canvas` or the Recharts `toBase64Image()` method to download the chart as a PNG file.

4. **Chart 2 — Cycle Time Histogram (Recharts):**
   - Use existing `CycleTimeHistogram.tsx` from `components/charts/`.
   - Buckets: `0–24h`, `24–48h`, `48–72h`, `>72h`.
   - Add "Export PNG" button.

5. **Chart 3 — Approval Rate by Decision Type (Recharts BarChart):**
   - New component `client/src/components/charts/ApprovalRateByTypeChart.tsx`.
   - Fetch from `GET /api/analytics/kpi-summary` grouped by decision category.
   - X-axis: decision type/category labels. Y-axis: approval rate %. Bar color: green.
   - Add "Export PNG" button.

6. **Chart 4 — Status Funnel (Apache ECharts):**
   - New component `client/src/components/charts/StatusFunnelChart.tsx`.
   - Use `echarts-for-react`. ECharts `funnel` chart type.
   - Stages (in order, widest to narrowest): Submitted → Under Review → Approved / Rejected.
   - Data sourced from KPI summary: total submitted, pending+approved+rejected, approved count.
   - Add "Export PNG" button (ECharts exposes `getDataURL()`).

7. **Chart 5 — Rejection Reasons Pie (Recharts PieChart):**
   - New component `client/src/components/charts/RejectionReasonsPieChart.tsx`.
   - **Backend:** Add new endpoint `GET /api/analytics/rejection-reasons` in `analyticsRoutes.ts`. Queries `m1_decisions` where `status === 'rejected'`, groups by `rejectionReason` field (if field exists) or returns a placeholder grouped by `department` if reason field is not in schema.
   - **Frontend:** Fetch from the new endpoint, render as Recharts `PieChart` + `Pie` + `Cell` with `COLORS` array for slices.

8. **Add route** in `App.tsx`: `/analytics/decisions` → `<DecisionAnalytics />` wrapped in `<ProtectedRoute>`.

9. **Add sidebar link** in `Sidebar.tsx`: "Decision Analytics" under Analytics section linking to `/analytics/decisions`.

---

## BLOCK 1.6 — PAGE: Compliance Analytics

**File:** `client/src/pages/ComplianceAnalytics.tsx`
**Route:** `/analytics/compliance`

### What this page shows (per spec)
Overall compliance % KPI card, multi-department compliance trend chart, violation severity breakdown bar chart, department compliance heatmap, top violated policies table, department multi-select filter.

### Steps

1. **Create `client/src/pages/ComplianceAnalytics.tsx`.**

2. **Top section — Filters bar:**
   - Multi-select department dropdown (allow selecting multiple departments simultaneously). Install `react-select` if not present, or build a custom checkbox dropdown using existing TailwindCSS.
   - Date range picker.
   - Policy category filter dropdown.

3. **KPI Card row (top):**
   - Single large `KPICard` showing overall compliance % (org-wide, for selected date range). Fetch from `GET /api/analytics/kpi-summary` (no deptId) and read `complianceRate`.

4. **Chart 1 — Multi-department Compliance Trend (Apache ECharts multi-line):**
   - New component `client/src/components/charts/ComplianceTrendMultiChart.tsx`.
   - Fetches `GET /api/analytics/compliance-trend?deptIds=FI001,HR002,...` for each selected department.
   - Renders one line per department using `echarts-for-react` LineChart.
   - Reference line at 95% (compliance target) rendered as a `markLine`.
   - Fix the known `deptId` vs `deptIds` mismatch: update `analyticsRoutes.ts` so `compliance-trend` accepts `?deptIds` (plural, comma-separated) and loops through them to produce a multi-series response. Also ensure the filter works when a single `deptId` is passed for backward compatibility.

5. **Chart 2 — Violation Severity Breakdown (Recharts BarChart):**
   - New component `client/src/components/charts/ViolationSeverityChart.tsx`.
   - Fetch from `GET /api/analytics/risk-heatmap` (already returns severity × department data).
   - Group by severity across all selected departments.
   - Render as a grouped or stacked Recharts BarChart: X-axis = severity (Low/Medium/High/Critical), Y-axis = violation count. Colors: green/yellow/orange/red.

6. **Chart 3 — Department Compliance Heatmap (Apache ECharts):**
   - New component `client/src/components/charts/DeptComplianceHeatmap.tsx`.
   - Use `echarts-for-react` heatmap chart type. Y-axis: departments. X-axis: date buckets (weekly). Cell color: green (100%) → red (0%). Data from compliance-trend endpoint.

7. **Table — Top Violated Policies:**
   - **Backend:** Add `GET /api/analytics/top-violated-policies` in `analyticsRoutes.ts`. Query `m2_violations` directly (Module 3 already has read access per spec), group by `policyId`, count violations, sort descending, limit 10. Return `[{ policyId, policyName, violationCount, departments }]`.
   - **Frontend:** Render as a plain HTML table with columns: Policy Name, Violation Count, Departments Affected. Clicking a row filters the heatmap to show only that policy's departments.

8. **Add route** in `App.tsx`: `/analytics/compliance` → `<ComplianceAnalytics />` wrapped in `<ProtectedRoute>`.

9. **Add sidebar link** in `Sidebar.tsx`: "Compliance Analytics" under Analytics section.

---

## BLOCK 1.7 — PAGE: Department Performance

**File:** `client/src/pages/DepartmentPerformance.tsx`
**Route:** `/analytics/departments`

### What this page shows (per spec)
Side-by-side comparison of up to 5 departments across cycle time, decision volume, compliance rate, risk score, and violation count. Comparison bar charts, radar chart, ranking table with rank-change delta arrows, metric selector.

### Steps

1. **Create `client/src/pages/DepartmentPerformance.tsx`.**

2. **Department selector:**
   - Multi-select dropdown allowing up to 5 departments. When a 6th is attempted, show an inline warning "Maximum 5 departments".
   - Default: pre-select all 5 department codes (FI001, HR002, OP003, IT004, CS005).

3. **Metric selector:**
   - Horizontal toggle/tab bar: `Cycle Time | Compliance | Volume | Risk Score | Violation Count`.
   - Controlled state `selectedMetric`. Changes which metric is highlighted in the bar charts.

4. **Chart View toggle:**
   - Two icon buttons: `Bar Chart | Radar`. Controlled state `viewMode: 'bar' | 'radar'`.

5. **Bar chart view — Comparison Bar Charts (Recharts):**
   - When `viewMode === 'bar'`, show 5 separate `BarChart` components (one per metric): Avg Cycle Time, Total Decisions, Compliance %, Risk Score, Violation Count. Each chart has departments on X-axis and the metric value on Y-axis. Only the `selectedMetric` chart is highlighted (others are slightly dimmed with reduced opacity).

6. **Radar chart view (Apache ECharts):**
   - When `viewMode === 'radar'`, show a single ECharts radar chart.
   - 5 axes: Cycle Time, Compliance, Volume, Risk Score, Violation Count.
   - One polygon per selected department. Each department gets a distinct color (reuse sidebar accent colors).
   - Legend below the chart showing department name → color mapping.

7. **Ranking Table:**
   - Columns: Rank, Department Name, Avg Cycle Time (hrs), Total Decisions, Compliance %, AI Risk Score, Violation Count, Rank Change (delta arrow icon: ▲ +1 green, ▼ -1 red, — unchanged grey).
   - Rank change is computed by comparing current snapshot to the previous week's KPI snapshot. Fetch two date ranges from `kpi-summary` endpoint and compute diff.
   - Clicking a column header sorts the table by that metric.

8. **Backend:** No new endpoints needed. Fetch `GET /api/analytics/kpi-summary/:deptId` for each selected department in parallel (`Promise.all`). Extract the needed fields on the frontend.

9. **Add route** in `App.tsx`: `/analytics/departments` → `<DepartmentPerformance />` wrapped in `<ProtectedRoute>`.

10. **Add sidebar link** in `Sidebar.tsx`: "Department Performance" under Analytics section.

---

## BLOCK 1.8 — PAGE: KPI Config (Admin)

**File:** `client/src/pages/KPIConfig.tsx`
**Route:** `/admin/kpi-config`
**Backend:** `server/models/KPIConfig.ts` · `server/routes/kpiConfigRoutes.ts`

### What this page shows (per spec)
Admin-only table of all KPIs with their current live values, editable target values, warning threshold %, and critical threshold % inputs. Save All Changes and Reset to Defaults buttons.

### Steps

1. **Create `server/models/KPIConfig.ts`:**
   ```ts
   // Stores admin-configured thresholds per KPI name.
   // One document per KPI.
   const KPIConfigSchema = new Schema({
     kpiName: { type: String, required: true, unique: true },
     targetValue: { type: Number, required: true },
     warningThresholdPct: { type: Number, required: true },  // e.g., 80 means "warn if below 80% of target"
     criticalThresholdPct: { type: Number, required: true }, // e.g., 70 means "critical if below 70% of target"
     defaultTargetValue: { type: Number, required: true }    // for "Reset to Defaults"
   }, { timestamps: true });
   ```

2. **Create `server/routes/kpiConfigRoutes.ts`:**
   - `GET /api/admin/kpi-config` — returns all KPI config documents. Protected: `validateJWT + requireRole(['admin'])`.
   - `PUT /api/admin/kpi-config` — accepts array of `{ kpiName, targetValue, warningThresholdPct, criticalThresholdPct }`, bulk-upserts. Protected: `validateJWT + requireRole(['admin'])`.
   - `POST /api/admin/kpi-config/reset` — resets all documents to `defaultTargetValue`. Protected: admin only.

3. **Seed default KPI config** in `server/scripts/seedKPIConfig.ts`:
   ```ts
   // Inserts default configs for all 10 KPIs:
   // Total Decisions: target=500, warning=80%, critical=60%
   // Approval Rate: target=85, warning=80%, critical=70%
   // Rejection Rate: target=15, warning=20% (above), critical=30%
   // Avg Approval Time: target=24h, warning=48h, critical=72h (invert: higher is worse)
   // Bottleneck Rate: target=5%, warning=10%, critical=20%
   // Compliance Rate: target=95%, warning=85%, critical=75%
   // Violation Count: target=0, warning=10, critical=25
   // Decision Throughput: target=50/day, warning=30, critical=15
   // Anomaly Count: target=0, warning=5, critical=10
   // AI Risk Score: target=20, warning=50, critical=75
   ```
   Run once: `npx ts-node scripts/seedKPIConfig.ts`.

4. **Register route in `server/index.ts`:**
   ```ts
   import kpiConfigRoutes from './routes/kpiConfigRoutes';
   app.use('/api/admin', kpiConfigRoutes);
   ```

5. **Create `client/src/pages/KPIConfig.tsx`:**
   - Fetch current config from `GET /api/admin/kpi-config` on mount.
   - Fetch current live KPI values from `GET /api/analytics/kpi-summary` on mount.
   - **Table layout:** one row per KPI. Columns: KPI Name · Current Live Value (read-only, from kpi-summary) · Target Value (number input) · Warning Threshold % (number input) · Critical Threshold % (number input).
   - All inputs are controlled React state — changes do not auto-save.
   - **Save All Changes button:** calls `PUT /api/admin/kpi-config` with the entire updated array. Show success toast on 200.
   - **Reset to Defaults button:** calls `POST /api/admin/kpi-config/reset`, then re-fetches config.
   - This page is **admin-only**: wrap in `<ProtectedRoute allowedRoles={['admin']}>`.

6. **Wire thresholds into `KPICard.tsx`:**
   - Update `KPICard.tsx` to accept optional `target`, `warningThresholdPct`, `criticalThresholdPct` props.
   - Compute status: if `value >= target * (warningThresholdPct/100)` → green; if between warning and critical → yellow; if below critical threshold → red.
   - Apply status color to the card's top border or value text.
   - In `Dashboard.tsx`, fetch KPI config and pass thresholds to each `KPICard`.

7. **Add route** in `App.tsx`: `/admin/kpi-config` → `<KPIConfig />` wrapped in `<ProtectedRoute allowedRoles={['admin']}>`.

8. **Add sidebar link** in `Sidebar.tsx`: "KPI Config" under an Admin section (only rendered if `decodeToken().role === 'admin'`).

---

---

# DAY 2 — Backend Completion, AI/ML Insights Panel, and Report Enhancements

**Goal:** Fill in all empty/missing backend logic, build the unified AI/ML Insights Panel, and bring the Report Builder and Schedules pages to full spec.

---

## BLOCK 2.1 — Implement `retrainJob.ts` (Weekly Cron)

**File:** `server/jobs/retrainJob.ts`

### Steps

1. **Open `server/jobs/retrainJob.ts`** (currently empty).

2. **Implement the weekly retraining cron:**
   ```ts
   import cron from 'node-cron';
   import mlService from '../services/mlService';
   import axios from 'axios';
   // Schedule: Every Sunday at 03:00 AM
   cron.schedule('0 3 * * 0', async () => {
     console.log('[retrainJob] Starting weekly model retraining...');
     try {
       // Step 1: POST to FastAPI to retrain all three models
       await mlService.retrainModels();
       console.log('[retrainJob] Model retraining triggered successfully.');
       // Step 2: Log retraining event to Module 2 audit endpoint
       await axios.post(
         `${process.env.MODULE2_BASE_URL}/api/internal/audit/log`,
         { action: 'MODEL_RETRAINED', performedBy: 'system', details: 'Weekly retraining of Isolation Forest, Prophet, and Random Forest models.' },
         { headers: { 'x-service-key': process.env.SERVICE_KEY } }
       );
       console.log('[retrainJob] Audit log written to Module 2.');
     } catch (err) {
       console.error('[retrainJob] Retraining failed:', err);
     }
   });
   ```

3. **Update `server/services/mlService.ts`:**
   - Add `retrainModels()` function: sends `POST /ml/models/train` to FastAPI with `x-service-key` header.

4. **Register the job in `server/index.ts`:**
   ```ts
   import './jobs/retrainJob';
   ```

5. **Add `.env` variable:** `MODULE2_BASE_URL=http://localhost:3002`

6. **Add manual trigger script `server/scripts/runRetrainJob.ts`:**
   ```ts
   // Manually triggers model retraining without waiting for cron
   ```
   Add npm script in `server/package.json`: `"run:retrain-job": "npx ts-node scripts/runRetrainJob.ts"`.

---

## BLOCK 2.2 — Implement `riskJob.ts` (Placeholder → Working)

**File:** `server/jobs/riskJob.ts`

### Steps

1. **Open `server/jobs/riskJob.ts`** (currently empty placeholder).

2. **Implement proper risk scoring job:**
   - This job already exists as `riskScoringJob.ts` (confirmed working per progress doc).
   - `riskJob.ts` should simply re-export or call the same function to serve as a named entry point for the manual trigger script.
   - Add `MODULE2_BASE_URL` call: before sending data to FastAPI, the job must call `GET /api/risks/score/:deptId` on Module 2 (using `axios` + `x-service-key` header) for each department to get the `compositeScore` and `breakdown` fields.
   - Combine Module 2 risk features with local `m2_violations` counts (already done via direct MongoDB query).
   - This fulfills the spec requirement for step `[12] GET /api/risks/score/:deptId → M2` in the sequence diagram.

3. **Test:** Run `npm run run:risk-job` and verify that Module 2's endpoint is called. If Module 2 is not running, the job should catch the error, log it, and fall back to local-only features (not crash the entire job).

---

## BLOCK 2.3 — Nodemailer: Email Delivery for Scheduled Reports

**Files:** `server/services/emailService.ts` (new) · `server/jobs/reportScheduleJob.ts`

### Steps

1. **Install Nodemailer:**
   ```bash
   cd server && npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **Create `server/services/emailService.ts`:**
   ```ts
   import nodemailer from 'nodemailer';
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: Number(process.env.SMTP_PORT) || 587,
     secure: false,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   });
   export async function sendReportEmail(
     recipients: string[],
     reportName: string,
     downloadUrl: string
   ): Promise<void> {
     await transporter.sendMail({
       from: `"GovVision Reports" <${process.env.SMTP_USER}>`,
       to: recipients.join(', '),
       subject: `GovVision Report Ready: ${reportName}`,
       html: `
         <h2>${reportName} is ready</h2>
         <p>Your scheduled report has been generated.</p>
         <a href="${downloadUrl}" style="background:#1A1F2E;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">
           Download Report
         </a>
         <p style="color:#888;font-size:12px;">This link expires in 24 hours.</p>
       `
     });
   }
   ```

3. **Update `server/jobs/reportScheduleJob.ts`:**
   - After the report file is written and `m3_reports` is updated to `status: 'completed'`:
   - Import `sendReportEmail` from `emailService.ts`.
   - Build the `downloadUrl`: `${process.env.APP_BASE_URL}/api/reports/download/${reportId}`.
   - Call `await sendReportEmail(schedule.recipients, schedule.name, downloadUrl)`.
   - Wrap in try/catch: email failure should log but not mark the report as failed.

4. **Add `.env` variables:**
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   APP_BASE_URL=http://localhost:3003
   ```

---

## BLOCK 2.4 — Module 2 Integration: Report Generation Enrichment

**Files:** `server/services/reportGenerator.ts` · `server/routes/reportRoutes.ts`

### Steps

1. **Open `server/services/reportGenerator.ts`.**

2. **Before assembling PDF/Excel output, add Module 2 data fetching:**
   ```ts
   // Step: Call Module 2 compliance status endpoint
   const complianceData = await axios.get(
     `${process.env.MODULE2_BASE_URL}/api/compliance/status`,
     { headers: { 'x-service-key': process.env.SERVICE_KEY } }
   ).then(r => r.data).catch(() => null); // graceful fallback if M2 unavailable
   ```

3. **PDF enrichment:** Add a "Compliance Summary" section in the PDF after the KPI table. Use `jsPDF autoTable` to render `complianceData.deptBreakdown` as a table with columns: Department, Compliance %, Violation Count.

4. **Excel enrichment:** Add `Sheet 3: Compliance Breakdown` using `ExcelJS`. Columns: Department, Compliance %, Violation Count, Top Violated Policy.

5. **After report generation, log to Module 2 audit:**
   ```ts
   await axios.post(
     `${process.env.MODULE2_BASE_URL}/api/internal/audit/log`,
     { action: 'REPORT_GENERATED', reportId, reportType, generatedBy: userId },
     { headers: { 'x-service-key': process.env.SERVICE_KEY } }
   ).catch(() => {}); // non-blocking
   ```

6. **If Module 2 is unavailable:** both calls are wrapped in `.catch(() => null)` so report generation succeeds even when Module 2 is offline.

---

## BLOCK 2.5 — PAGE: AI/ML Insights Panel (Unified)

**File:** `client/src/pages/AIInsightsPanel.tsx`
**Route:** `/ai/insights`

### What this page shows (per spec)
Combined single page: Anomaly Cards (Isolation Forest) + Prophet Forecast Chart + Risk Score Gauges (Random Forest) + Model Confidence indicators + Last Retrained timestamp.

> Note: `AnomalyDetection.tsx` and `DeepInsights.tsx` cover parts of this, but this is a new unified page as specced. Existing pages remain accessible.

### Steps

1. **Create `client/src/pages/AIInsightsPanel.tsx`.**

2. **Section 1 — Anomaly Cards (top-left, occupies ~40% of page width):**
   - Reuse `AnomalyFeed.tsx` component.
   - Title: "Isolation Forest Anomalies".
   - Show list of unacknowledged anomalies. Each card: severity color badge (Critical=red, High=orange, Medium=yellow, Low=green), auto-generated description text (e.g., "Decision #D-0421 has cycle time 3.2× above department average"), a link "View Decision →" (links to `/anomaly` with that decision pre-filtered), and an Acknowledge button.
   - On Acknowledge: `PUT /api/ai/anomalies/:id/acknowledge`, then remove the card from the list.
   - Empty state: "No active anomalies detected."

3. **Section 2 — Prophet Forecast Chart (top-right, occupies ~60% of page width):**
   - Reuse `ForecastChart.tsx` and `HorizonToggle.tsx` and `TargetToggle.tsx`.
   - Add a department selector dropdown above the chart (single-select).
   - Title: "Predictive Delay Forecast".

4. **Section 3 — Risk Score Gauges (bottom row, one gauge per department):**
   - New component `client/src/components/RiskGauge.tsx`.
   - Use `echarts-for-react` gauge chart type (semi-circular gauge, 0–100).
   - Color bands: 0–30 green, 30–60 yellow, 60–80 orange, 80–100 red.
   - One gauge per department (5 gauges for Finance, HR, Operations, IT, Customer Service).
   - Fetch from `GET /api/ai/risk-scores` (existing endpoint returns per-dept scores).
   - Clicking a gauge opens the existing `FeatureBreakdownModal.tsx` for that department.

5. **Section 4 — Model Status Bar (bottom of page):**
   - A horizontal bar with 3 blocks, one per model.
   - Each block shows: Model Name (Isolation Forest / Prophet / Random Forest), Last Trained date (fetch from new backend endpoint below), Model Confidence % (from the last training validation run if available, else "N/A").
   - **Backend:** Add `GET /api/ai/model-status` in `aiRoutes.ts`. Returns `[{ modelName, lastTrained, confidence }]`. The `lastTrained` date is read from `m2_audit_logs` (filter for action `MODEL_RETRAINED`) via Module 2, or from a local `m3_model_status` collection (simpler: create a small collection updated by `retrainJob.ts` after each retrain).

6. **Wire `DeepInsights.tsx` into router** (currently not routed):
   - Add route in `App.tsx`: `/anomaly/deep/:id?` → `<DeepInsights />` wrapped in `<ProtectedRoute>`.
   - Update the "View Decision →" links in Section 1 to navigate to `/anomaly/deep/${anomaly.decisionId}`.

7. **Add route** in `App.tsx`: `/ai/insights` → `<AIInsightsPanel />` wrapped in `<ProtectedRoute>`.

8. **Add sidebar link** in `Sidebar.tsx`: "AI/ML Insights" under AI section, replacing or sitting alongside the existing Deep Insights link.

---

## BLOCK 2.6 — Report Builder Enhancements

**File:** `client/src/pages/ReportBuilder.tsx`

### Steps

1. **Add Widget Checkboxes section:**
   - Below the existing "Report Type" selector, add a labelled group: "Include Widgets".
   - Checkboxes: `☐ KPI Table  ☐ Compliance Chart  ☐ Anomaly List  ☐ Risk Scores  ☐ Decision Volume`.
   - Controlled state: `selectedWidgets: string[]`.
   - Pass `widgets: selectedWidgets` in the `POST /api/reports/generate` request body.

2. **Add "Save as Template" button:**
   - Next to the Generate button, add a secondary "Save as Template" button.
   - On click: `POST /api/reports/templates` with the current form state (`reportType`, `dateFrom`, `dateTo`, `departments`, `widgets`, `format`, `name`).
   - **Backend:** Add `server/routes/reportTemplateRoutes.ts` with `POST /api/reports/templates` (saves to a new `m3_report_templates` collection) and `GET /api/reports/templates` (returns all saved templates). Add a "Load Template" dropdown at the top of the form.

3. **Add "Schedule This Report" button:**
   - Below the Generate button, add a tertiary "Schedule This Report" button.
   - On click: pre-fill and open the `AddScheduleModal.tsx` with the current form's `reportType`, `format`, and `departments` already populated.
   - This avoids the user having to re-enter parameters in the schedules page.

4. **Add estimated output scope preview:**
   - Below the department multi-select, show a small grey info line: "Estimated: ~{X} decisions · {Y} departments · {dateRange} days".
   - Computed locally from the form state — no API call needed. Estimate decisions as `totalDecisions / numDepts * selectedDepts.length / 365 * dayRange`.

---

## BLOCK 2.7 — Report Schedules Page Enhancements

**File:** `client/src/pages/ReportSchedules.tsx` · `client/src/components/AddScheduleModal.tsx`

### Steps

1. **Add Recipients email list to `AddScheduleModal.tsx`:**
   - Add a textarea field labeled "Recipients (comma-separated emails)".
   - On blur: split by comma, trim whitespace, validate each entry with a simple email regex. Show inline error for invalid addresses.
   - Pass `recipients: string[]` in the create/edit schedule API call body.

2. **Add "Manual Run Now" button per schedule:**
   - In the schedule table, add a "Run Now" button in each row's action column.
   - On click: `POST /api/reports/schedules/:id/run` (new endpoint).
   - **Backend:** Add `POST /api/reports/schedules/:id/run` in `reportRoutes.ts`. Finds the schedule, calls `reportGenerator.generate()` immediately, returns `{ reportId }`.
   - Show a toast: "Report generation started. Check Report History."

3. **Add per-row Run History expansion:**
   - Each row has a `▼` expand toggle.
   - On expand: fetch `GET /api/reports/schedules/:id/history` (new endpoint returning the last 10 runs for this schedule with `{ runDate, status, reportId }`).
   - **Backend:** Add `GET /api/reports/schedules/:id/history` in `reportRoutes.ts`. Queries `m3_reports` filtered by `scheduleId` field, sorted by `createdAt` descending, limit 10.
   - Render history as a mini-table inside the expanded row: columns `Date`, `Status badge`, `Download` link.

---

---

# DAY 3 — UI Polish, Testing, Redis Verification, and DevOps

**Goal:** Bring the existing dashboard to full spec, verify Redis cache operation, expand test coverage, and set up CI/CD automation.

---

## BLOCK 3.1 — Dashboard Enhancements

**File:** `client/src/pages/Dashboard.tsx`

### Steps

1. **KPI Card click-through navigation (per spec):**
   - Each `KPICard` must navigate to the relevant detail page when clicked.
   - Update `KPICard.tsx` to accept an optional `linkTo?: string` prop. Wrap the card in `<Link to={linkTo}>` from `react-router-dom` when the prop is provided.
   - In `Dashboard.tsx`, pass `linkTo` to each card:
     - Total Decisions → `/analytics/decisions`
     - Compliance Rate → `/analytics/compliance`
     - AI Risk Score → `/risk`
     - Anomaly Count → `/ai/insights`
     - Approval Rate, Rejection Rate, Avg Approval Time, Bottleneck Rate, Violation Count, Decision Throughput → `/analytics/decisions`

2. **Department Performance Radar Chart (per spec — currently missing from Dashboard):**
   - Add a new section at the bottom of `Dashboard.tsx` below the existing risk heatmap.
   - Title: "Department Performance Overview".
   - Render the `DepartmentPerformance` radar chart component (created in Day 1 Block 1.7) in radar view mode, pre-loaded with all 5 departments, no metric selector (show all 5 axes).
   - Add a "View Full Comparison →" link to `/analytics/departments`.

3. **Live pulse indicator (per spec):**
   - Next to the "Analytics Dashboard" page title, add a pulsing green dot + "Live" text.
   - Use a CSS animation (`animate-pulse` from Tailwind) applied to a small green circle `div`.
   - The indicator turns grey ("Stale") if the last successful data fetch is more than 2 minutes ago (track `lastFetchTime` in state, compare in a `setInterval` every 10 seconds).

4. **KPI Card threshold colors:**
   - Fetch KPI config from `GET /api/admin/kpi-config` on Dashboard mount.
   - Pass `target`, `warningThresholdPct`, and `criticalThresholdPct` into each `KPICard` (wired in Day 1 Block 1.8 Step 6).

---

## BLOCK 3.2 — UI/UX Polish Pass

**Files:** All pages and shared components.

### Steps

1. **`DeepInsights.tsx` — Recolor and font pass (per progress doc pending item):**
   - Open `DeepInsights.tsx`. Audit all hardcoded color values (e.g., `#3B82F6`, `text-blue-500`).
   - Replace with the project's design tokens: background `#F5F6FA`, sidebar `#1A1F2E`, accent colors from the existing `KPICard` and `AnomalyFeed` color system.
   - Ensure font usage is consistent: headings use `Outfit`, body text uses `DM Sans`. Check that `font-family` in Tailwind config is correct and applied on these components.
   - Verify that the severity color badges (Critical/High/Medium/Low) use the same hex values as in `AnomalyFeed.tsx`.

2. **Sidebar — Add all new routes:**
   - Add links for: Decision Analytics, Compliance Analytics, Department Performance (Analytics section).
   - Add links for: AI/ML Insights (AI section).
   - Add links for: KPI Config (Admin section, role-gated).
   - Ensure the active link is visually highlighted (check existing active state logic in `Sidebar.tsx`).

3. **`TopBar.tsx` — Add user info and logout:**
   - Show the logged-in user's name and role badge on the right side of the TopBar (read from `decodeToken()`).
   - Add a "Logout" button that calls `clearToken()` and navigates to `/login`.

4. **Loading states:**
   - Audit all new pages created in Days 1 and 2. Confirm each data-fetching `useEffect` sets a `loading` state and renders `<SkeletonLoader />` while loading.
   - Confirm error states show a user-friendly message ("Failed to load data. Please try again.") rather than a blank page or console error.

5. **Responsive layout check:**
   - Open each new page at 1280px (standard laptop). Confirm no horizontal scroll and no overlapping elements.

---

## BLOCK 3.3 — Redis Cache Verification

**Files:** `server/services/cacheService.ts` · `server/routes/analyticsRoutes.ts`

### Steps

1. **Add cache-hit logging:**
   - Open `server/services/cacheService.ts`.
   - In `getOrSet()`, add a `console.log` (or use a logger) on the cache-hit branch:
     ```ts
     console.log(`[Cache HIT] key=${key}`);
     ```
   - And on the cache-miss branch:
     ```ts
     console.log(`[Cache MISS] key=${key} — fetching from DB`);
     ```

2. **Verify cache keys match the spec Redis key pattern:**
   - Spec defines: `m3:kpi:{dept}:{date}`, `m3:anomalies:active`, `m3:forecast:{dept}:{horizon}`, `m3:riskscore:{dept}`.
   - Open each route file and confirm cache keys follow this exact pattern.
   - Rename any that don't match (e.g., if the key is `kpi_summary_HR002_2025-01-01` instead of `m3:kpi:HR002:2025-01-01`).

3. **Test cache operation end-to-end:**
   - Start Redis/Memurai locally.
   - Start the backend.
   - Make `GET /api/analytics/kpi-summary` — expect `[Cache MISS]` in console.
   - Make the same request again within 5 minutes — expect `[Cache HIT]` in console.
   - Confirm the response times differ (cache hit should be <20ms, DB fetch >100ms).
   - Make `POST /api/events/decision-update` — expect cache invalidation log.
   - Make `GET /api/analytics/kpi-summary` again — expect `[Cache MISS]` (cache was cleared).

4. **Fix `deptId` vs `deptIds` filter mismatch on compliance-trend route:**
   - Open `server/routes/analyticsRoutes.ts`.
   - The `compliance-trend` endpoint currently reads `req.query.deptId` (singular).
   - Update to accept both: read `req.query.deptIds` (comma-separated string), split to array, loop through each to produce multi-department data. If `deptIds` is absent, fall back to `req.query.deptId` for backward compatibility.

---

## BLOCK 3.4 — Expand Test Coverage

**Focus:** Server middleware, new routes, and key client pages.

### Server Tests (Jest) — `server/__tests__/`

1. **`routes/authRoutes.test.ts`** — new file:
   - `POST /api/auth/login` with valid credentials → expect 200 + `accessToken`.
   - `POST /api/auth/login` with wrong password → expect 401.
   - `POST /api/auth/login` with missing fields → expect 400.

2. **`routes/kpiConfigRoutes.test.ts`** — new file:
   - `GET /api/admin/kpi-config` with admin JWT → expect 200 + array.
   - `GET /api/admin/kpi-config` with manager JWT → expect 403.
   - `PUT /api/admin/kpi-config` with admin JWT + valid body → expect 200.

3. **`routes/analyticsRoutes.test.ts`** — new file:
   - `GET /api/analytics/kpi-summary` with no token → expect 401.
   - `GET /api/analytics/kpi-summary` with valid manager JWT → expect 200.

4. **`middleware/validateJWT.test.ts`** — update existing:
   - Remove any test that tests the `x-test-role` bypass (it's been deleted).
   - Add test: expired JWT → expect 401.

### Client Tests (Vitest) — `client/src/__tests__/`

5. **`pages/LoginPage.test.tsx`** — new file:
   - Renders email and password inputs.
   - On submit with valid credentials, calls the login API.
   - On 401 response, shows error message.

6. **`components/ProtectedRoute.test.tsx`** — new file:
   - With no token in localStorage → renders redirect to `/login`.
   - With valid token → renders children.
   - With valid token but wrong role → renders redirect to `/unauthorized`.

7. **`pages/KPIConfig.test.tsx`** — new file:
   - Renders a table with one row per KPI.
   - "Save All Changes" button calls the PUT endpoint.
   - "Reset to Defaults" button calls the reset endpoint.

### ML Service Tests (Pytest) — `ml_service/tests/`

8. **`tests/test_retrain_endpoint.py`** — new file:
   - `POST /ml/models/train` with valid service key → expect 200 + `{ status: 'retraining_started' }`.
   - `POST /ml/models/train` with invalid service key → expect 401.

---

## BLOCK 3.5 — DevOps: CI/CD Setup

**Files:** `.github/workflows/ci.yml` (new) · Root-level `docker-compose.yml` (new)

### Steps

1. **Create `.github/workflows/ci.yml`:**
   ```yaml
   name: GovVision Module 3 CI
   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main]
   jobs:
     server-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: cd server && npm ci
         - run: cd server && npm test

     client-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: cd client && npm ci
         - run: cd client && npm test

     ml-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: '3.11' }
         - run: cd ml_service && pip install -r requirements.txt
         - run: cd ml_service && pytest --tb=short

     build-check:
       runs-on: ubuntu-latest
       needs: [server-tests, client-tests, ml-tests]
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: cd client && npm ci && npm run build
   ```

2. **Create root `docker-compose.yml`** for local dev parity:
   ```yaml
   version: '3.9'
   services:
     mongo:
       image: mongo:7
       ports: ["27017:27017"]
       volumes: ["mongo_data:/data/db"]

     redis:
       image: redis:7-alpine
       ports: ["6379:6379"]

     ml_service:
       build: ./ml_service
       ports: ["8000:8000"]
       environment:
         - SERVICE_KEY=${SERVICE_KEY}

     server:
       build: ./server
       ports: ["3003:3003"]
       depends_on: [mongo, redis, ml_service]
       environment:
         - MONGODB_URI=mongodb://mongo:27017/govvision
         - REDIS_URL=redis://redis:6379
         - ML_SERVICE_URL=http://ml_service:8000
         - JWT_SECRET=${JWT_SECRET}
         - SERVICE_KEY=${SERVICE_KEY}

     client:
       build: ./client
       ports: ["5173:80"]
       depends_on: [server]

   volumes:
     mongo_data:
   ```

3. **Create `ml_service/Dockerfile`:**
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

4. **Create `server/Dockerfile`:**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json .
   RUN npm ci
   COPY . .
   RUN npm run build
   CMD ["node", "dist/index.js"]
   ```

5. **Create `client/Dockerfile`:**
   ```dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json .
   RUN npm ci
   COPY . .
   RUN npm run build
   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   EXPOSE 80
   ```

6. **Add `.env.example`** at the root with all required variables documented (no secrets):
   ```
   JWT_SECRET=your_jwt_secret_here
   SERVICE_KEY=your_service_key_here
   MONGODB_URI=mongodb://localhost:27017/govvision
   REDIS_URL=redis://localhost:6379
   ML_SERVICE_URL=http://localhost:8000
   MODULE2_BASE_URL=http://localhost:3002
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASS=
   APP_BASE_URL=http://localhost:3003
   ALLOWED_ORIGINS=http://localhost:5173
   ```

---

## BLOCK 3.6 — Final Integration Smoke Test

Run through the complete end-to-end flow manually before marking the module complete.

### Checklist

- [ ] Start all services: MongoDB, Redis, ML service, backend server, client dev server.
- [ ] Navigate to `http://localhost:5173` → redirected to `/login`.
- [ ] Log in with admin credentials → redirected to `/dashboard`.
- [ ] Dashboard loads with all KPI cards, all charts, Live pulse indicator visible.
- [ ] Click an anomaly Acknowledge button → card disappears, anomaly count KPI decrements.
- [ ] Click "Compliance Rate" KPI card → navigates to `/analytics/compliance`.
- [ ] Navigate to `/analytics/decisions` → all 5 charts load, export PNG works on one chart.
- [ ] Navigate to `/analytics/departments` → radar chart shows 5 departments, ranking table is sortable.
- [ ] Navigate to `/ai/insights` → anomaly cards, forecast chart, risk gauges, and model status bar all render.
- [ ] Navigate to `/admin/kpi-config` (admin only) → KPI table loads. Change a target value, save, reload → value persists.
- [ ] Navigate to `/reports/builder` → widget checkboxes visible, generate a PDF → download works.
- [ ] Navigate to `/reports/schedules` → create a schedule with recipient email → run manually → report appears in history.
- [ ] Log out → redirected to `/login`. Attempting to navigate to `/dashboard` redirects back to `/login`.
- [ ] Check backend console: Redis cache HIT logs appear on repeated KPI summary requests.
- [ ] Run `npm run run:retrain-job` from server directory → confirm FastAPI retraining endpoint is called and Module 2 audit log is written.
- [ ] Run all three test suites: `npm test` (server), `npm test` (client), `pytest` (ml_service) → all pass.

---

## Summary Table

| Block | Day | Area | Deliverable |
|-------|-----|------|-------------|
| 1.1 | 1 | Server | Remove dev JWT bypass, enforce auth on all analytics routes |
| 1.2 | 1 | Server | Rate limiting, CORS hardening, helmet confirmed |
| 1.3 | 1 | Server | Auth endpoints (login, register), User model, seed admin |
| 1.4 | 1 | Client | LoginPage, ProtectedRoute, axios interceptors, logout |
| 1.5 | 1 | Client | Decision Analytics page (5 charts, filters, export PNG) |
| 1.6 | 1 | Client | Compliance Analytics page (heatmap, multi-line, top policies table) |
| 1.7 | 1 | Client | Department Performance page (radar, bar charts, ranking table) |
| 1.8 | 1 | Client + Server | KPI Config admin page, KPIConfig model + endpoints, seed, threshold wiring |
| 2.1 | 2 | Server | retrainJob.ts fully implemented with cron + ML call + audit log |
| 2.2 | 2 | Server | riskJob.ts wired to call Module 2 for risk features |
| 2.3 | 2 | Server | Nodemailer email delivery for scheduled reports |
| 2.4 | 2 | Server | Report generation enriched with Module 2 compliance data + audit log |
| 2.5 | 2 | Client | AI/ML Insights Panel (anomalies + forecast + risk gauges + model status) |
| 2.6 | 2 | Client | Report Builder: widget checkboxes, Save Template, Schedule shortcut, scope preview |
| 2.7 | 2 | Client | Report Schedules: recipients, Manual Run Now, per-row history expansion |
| 3.1 | 3 | Client | Dashboard: KPI card nav, radar chart section, live pulse, threshold colors |
| 3.2 | 3 | Client | UI polish: DeepInsights recolor, Sidebar links, TopBar user info/logout |
| 3.3 | 3 | Server | Redis cache-hit logging, key pattern verification, deptIds filter fix |
| 3.4 | 3 | All | Expanded test coverage: auth, kpiConfig, analytics, login, ProtectedRoute, retrain |
| 3.5 | 3 | DevOps | GitHub Actions CI pipeline, docker-compose, Dockerfiles, .env.example |
| 3.6 | 3 | All | End-to-end smoke test checklist |
