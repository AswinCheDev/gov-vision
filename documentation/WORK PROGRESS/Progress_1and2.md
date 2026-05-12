# GovVision Module 3 — Implementation Record

## What's Left To Do (14 items)

1. Re-enable JWT/role enforcement on analytics routes and remove the dev test-role bypass in JWT middleware.
2. Build user management and role-based UI flows (login, role gates, admin screens).
3. Add production-grade security (HTTPS, rate limiting, hardening).
4. Implement missing analytics pages: Decision Analytics, Compliance Analytics, Department Performance, KPI Config (Admin).
5. Align AI endpoint naming/contracts between frontend and backend (forecast, risk-scores, retrain).
6. Train and generate forecast models for pending_workload and sla_misses targets (cron + ML support).
7. Expand reporting to full spec: widget selection, templates, schedule recipients + email delivery, richer PDF/Excel sections.
8. Implement weekly retraining cron for Prophet and Random Forest (`retrainJob.ts` is currently empty).
9. Integrate Module 2 risk/compliance features into risk scoring pipeline.
10. Align compliance trend filters (deptId vs deptIds) and verify Redis cache-hit evidence at runtime.
11. UI/UX polish and new visualizations (Deep Insights recolor/font pass, broader UI enhancements).
12. DevOps and deployment automation (CI/CD, monitoring).
13. Expand existing test coverage across backend, frontend, and ML layers (test infrastructure is in place).
14. Ongoing documentation and process refinement updates.

---

## Pages Created and Functionality (9 pages)

| Page                 | File                   | Features                                                                                                                                  |
|----------------------|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|  
| Analytics Dashboard  | `Dashboard.tsx`        | KPI cards, anomaly feed, decision volume chart, cycle time histogram, compliance trend, risk heatmap, department/date filters, auto refresh |
| Anomaly Detection    | `AnomalyDetection.tsx` | Anomaly list, severity filters, acknowledge flow                                                                                          |
| Deep Insights        | `DeepInsights.tsx`     | Detailed anomaly investigation, severity/department filters, acknowledge flow, feature importance chart, stat cards                        |
| Forecast             | `ForecastPage.tsx`     | Forecast chart with horizon (7/14/30) and target toggles                                                                                  |
| Risk Score Dashboard | `RiskPage.tsx`         | Heatmap summary, score table, pie chart, feature breakdown modal                                                                          |
| Report Builder       | `ReportBuilder.tsx`    | Report type, date range, department selection, format selection (CSV/Excel/PDF), generate and download                                     |
| Report History       | `ReportHistory.tsx`    | Report list, filters, download action                                                                                                     |
| Report Schedules     | `ReportSchedules.tsx`  | Schedule list, create via modal, toggle active/inactive, delete                                                                            |
| Settings / Support   | `PlaceholderPage.tsx`  | Placeholder shells (not yet implemented)                                                                                                  |

Note: `DeepInsights.tsx` exists as a fully built page but is not currently routed in `App.tsx`. Only `AnomalyDetection.tsx` is wired to `/anomaly`.

---

## Overview

This document provides a consolidated implementation record covering setup, features, validation, and pending work for the GovVision Module 3 stack. It covers UI/UX, analytics, ML services, ETL, security, testing, and reporting.

GovVision is structured as a 3-part system:
1. **Client dashboard** (React + TypeScript + Vite + TailwindCSS) for analytics UI.
2. **Backend API** (Node.js + Express + TypeScript + MongoDB + Redis cache) for aggregation, analytics, and service orchestration.
3. **ML microservice** (FastAPI + Python + scikit-learn + Prophet) for anomaly detection, risk scoring, forecasting, and model retraining.

Main workspace structure:
- `client/` — Frontend React application
- `server/` — Backend Express API
- `ml_service/` — Python ML microservice
- `documentation/` — Project documentation

---

## Completed Work — Backend (Node.js/Express)

### Setup and Middleware

- Express TypeScript server with helmet, cors, morgan, and express.json middleware.
- Environment variable loading with dotenv.
- `validateJWT` middleware reads Authorization Bearer token, verifies JWT, and attaches payload to `req.user`. Includes dev fallback via `x-test-role` header.
- `requireRole` middleware restricts routes by role list.
- `serviceKey` middleware validates `x-service-key` for internal service-to-service endpoints.
- CORS allows localhost and 127.0.0.1 on any port.
- Redis optional in dev; Memurai used on Windows. Backend runs without cache via MongoDB fallback.

### Analytics Endpoints and KPI Aggregation

Analytics endpoints implemented in `server/routes/analyticsRoutes.ts`:
- `GET /api/analytics/kpi-summary` — Organization-wide KPI summary
- `GET /api/analytics/kpi-summary/:deptId` — Department-specific KPI summary
- `GET /api/analytics/decision-volume` — Decision volume over time
- `GET /api/analytics/cycle-time-histogram` — Cycle time distribution
- `GET /api/analytics/compliance-trend` — Compliance trend with target line
- `GET /api/analytics/risk-heatmap` — Risk aggregation by severity and department
- `GET /api/analytics/forecast` — Forecast data retrieval

KPI aggregation logic in `server/services/kpiAggregator.ts`:
- `aggregateKPI(deptId, dateFrom, dateTo)` and `aggregateOrgKPI(dateFrom, dateTo)`
- Computes totals, approvals, rejections, pending count, average cycle time, violation counts, compliance rate, anomaly count, and bottleneck metrics.
- KPI snapshots upserted into `KPI_Snapshot` collection for daily storage and re-use.
- Bottleneck KPI logic counts only pending tasks overdue their SLA.
- Compliance logic treats SLA as 0 for stricter compliance rate calculation.

JWT protection is present but currently commented on analytics GET routes for local development.

### AI Routes

Implemented in `server/routes/aiRoutes.ts`:
- `GET /api/ai/anomalies` — Returns anomalies grouped by severity (Critical/High/Medium/Low), with role-based access control (executives denied, others allowed), Redis caching.
- `PUT /api/ai/anomalies/:id/acknowledge` — Acknowledges anomaly, updates database, invalidates cache.
- Both routes use `validateJWT` + `requireRole` middleware.

### Cache Service (Redis)

Implemented in `server/services/cacheService.ts`:
- `getOrSet(key, ttlSeconds, fetchFn)`: read-through caching with TTL.
- `invalidate(pattern)`: wildcard invalidation of matching cache keys for event-driven refresh.
- Redis is optional in dev mode; cache failures fall back to MongoDB aggregation.

### Event Webhooks

Implemented in `server/routes/eventRoutes.ts`:
- `POST /api/events/decision-update` — Invalidates KPI cache and triggers re-aggregation.
- `POST /api/events/compliance-update` — Invalidates compliance-related cache for the department.
- Both routes require SERVICE_KEY authentication.

### Jobs and Scheduling

| Job File               | Schedule      | Function                                                                                                                                 |
|------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `anomalyJob.ts`        | Daily 00:00   | Scores unscored decisions via ML service, upserts anomalies, preserves acknowledgment state, invalidates anomalies cache                 |
| `forecastJob.ts`       | Nightly 02:00 | Generates forecasts for targets (volume, delay, approval_rate, rejection_rate) and horizons (7/14/30), upserts to Forecast, invalidates forecast cache |
| `riskScoringJob.ts`    | Daily 01:00   | Scores decisions via Random Forest, aggregates to department risk score, updates KPI snapshot risk fields, invalidates risk caches        |
| `reportScheduleJob.ts` | Hourly        | Checks for due schedules, generates reports, updates schedule run history                                                                |
| `retrainJob.ts`        | —             | **Empty file** — weekly retraining not yet implemented                                                                                   |
| `riskJob.ts`           | —             | **Empty file** — placeholder                                                                                                             |

### Report Generation

Implemented in `server/services/reportGenerator.ts`:
- **CSV** generation via json2csv for KPI summary.
- **Excel** generation via ExcelJS with KPI and anomaly sheets.
- **PDF** generation via jsPDF + autoTable with header, summary tables, and anomaly section.

Report routes in `server/routes/reportRoutes.ts`:
- Generate, history list, download, and schedule management endpoints.

### ML Service Integration

Implemented in `server/services/mlService.ts`:
- Axios-based HTTP client for calling the Python ML service.
- Uses `x-service-key` header for authentication.
- Called by anomaly, forecast, and risk scoring jobs.

### Data Models

| Model File                | Collection               | Purpose                                                                        |
|---------------------------|--------------------------|--------------------------------------------------------------------------------|
| `m1Decisions.ts`          | `m1_decisions`           | Primary decision documents from Module 1                                       |
| `m1TrainingDecisions.ts`  | `m1_training_decisions`  | Read-only BPI training dataset for ML model training (dual-source architecture) |
| `m2Violations.ts`         | `m2_violations`          | Compliance violations from Module 2                                            |
| `Anomaly.ts`              | `m3_anomalies`           | ML-detected anomalies with severity, scores, and acknowledgment state          |
| `KPI_Snapshot.ts`         | `m3_kpi_snapshots`       | Daily KPI aggregation snapshots                                                |
| `Forecast.ts`             | `m3_forecasts`           | Prophet forecast results                                                       |
| `Report.ts`               | `m3_reports`             | Generated report metadata and file references                                  |
| `ReportSchedule.ts`       | `m3_report_schedules`    | Scheduled report configurations                                                |

### Data Import and ETL Pipelines

#### CSV Import Pipeline
Script: `server/scripts/importCSV.ts`
- Source: `AI_Workflow_Optimization_Dataset_2500_Rows_v1.csv`
- Robust line parser with quoted CSV support.
- Row-to-document mapping with field normalization.
- Batch inserts with progress logging every 100 records.
- Field mapping: status, createdAt/completedAt, cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, hourOfDaySubmitted, priority.
- Department normalization: FI001→Finance, HR002→Human Resources, OP003→Operations, IT004→Information Technology, CS005→Customer Service, with alias mapping.
- Date timeline normalization shifts source timestamps into current window for dashboard visibility.

#### BPI Dataset Pipeline
Script: `server/scripts/importBPI.ts`
- Imports aggregated BPI (Business Process Intelligence) challenge data into `m1_training_decisions` collection.
- Provides a second, larger training dataset for ML models alongside the primary CSV dataset.
- Uses the `m1TrainingDecisions` model with `source: 'bpi_aggregated'` field.

Supporting XES processing scripts:
- `server/scripts/aggregate_xes.py` — Aggregates raw XES event logs into decision-level records.
- `server/scripts/convert_xes_to_csv.py` — Converts XES format to CSV for import.

#### Utility Scripts

| Script                           | Purpose                                                  |
|----------------------------------|----------------------------------------------------------|
| `seedData.ts`                    | Clear and insert randomized test records for early dev   |
| `resetDatabase.ts`               | Full database reset utility                              |
| `resetAnomalies.ts`              | Reset anomaly collection                                 |
| `resetUnacknowledged.ts`         | Reset acknowledgment state on anomalies                  |
| `generateHistoricalSnapshots.ts` | Backfill KPI snapshots for historical date ranges        |
| `runAnomalyJob.ts`               | Manual trigger for anomaly detection job                 |
| `runForecastJob.ts`              | Manual trigger for forecast job                          |
| `runRiskJob.ts`                  | Manual trigger for risk scoring job                      |
| `testAggregator.ts`              | Test KPI aggregation logic                               |

---

## Completed Work — Frontend (React + TypeScript + Vite)

### UI/UX and Layout

- **Sidebar** (`Sidebar.tsx`): Navigation for analytics and AI features, with Deep Insights section and utility links.
- **TopBar** (`TopBar.tsx`): Minimal, right-aligned notification bell and divider.
- **AppLayout** (`AppLayout.tsx`): Wraps sidebar + topbar + content outlet.
- **ErrorBoundary** (`ErrorBoundary.tsx`): Catches rendering errors gracefully.
- **Typography**: Outfit / DM Sans fonts, uppercase micro-labels, bold headings, subdued greys for secondary text.
- **Color System**: Dashboard background (#F5F6FA), sidebar (#1A1F2E), cards (white), semantic colors for status and anomaly severity.

### Components (21 files + 3 chart components)

| Component                    | Purpose                                                          |
|------------------------------|------------------------------------------------------------------|
| `KPICard.tsx`                | Animated cards for key metrics with bold typography and colors    |
| `AnomalyFeed.tsx`            | Real-time anomaly display, color-coded by severity               |
| `AnomalyBanner.tsx`          | Banner-style anomaly notification                                |
| `AnomalyTableRow.tsx`        | Table row for anomaly investigation with actions                 |
| `FeatureImportanceChart.tsx`  | Bar chart showing ML feature weights                             |
| `FeatureBreakdownModal.tsx`  | Modal for detailed feature analysis per risk score               |
| `ForecastChart.tsx`          | Prophet forecast visualization with confidence intervals         |
| `HorizonToggle.tsx`          | 7/14/30 day horizon selector                                     |
| `TargetToggle.tsx`           | Forecast target metric selector                                  |
| `RiskTable.tsx`              | Tabular risk score display by department                         |
| `RiskPieChart.tsx`           | Risk level distribution pie chart                                |
| `RiskLevelBadge.tsx`         | Color-coded risk level indicator                                 |
| `DateRangePicker.tsx`        | Date range filter using react-datepicker                         |
| `FormatSelector.tsx`         | Report format selector (CSV/Excel/PDF)                           |
| `AddScheduleModal.tsx`       | Modal for creating report schedules                              |
| `ReportsSubnav.tsx`          | Sub-navigation for report pages                                  |
| `SkeletonLoader.tsx`         | Loading placeholder animation                                    |
| `AccentDropdown`             | Custom styled dropdown (inline in DeepInsights)                  |

Chart components in `components/charts/`:

| Component                  | Library                      | Purpose                                  |
|----------------------------|------------------------------|------------------------------------------|
| `DecisionVolumeChart.tsx`  | Recharts AreaChart + BarChart | Decision volume over time                |
| `CycleTimeHistogram.tsx`   | Recharts BarChart            | Cycle time distribution with tooltips    |
| `ComplianceTrendChart.tsx`  | Apache ECharts               | Compliance trend with 95% target line    |

### Routing and API Integration

- BrowserRouter wiring in `main.tsx`, routes defined in `App.tsx`.
- Axios base URL logic supports `VITE_API_BASE_URL` override or host/port fallback.
- JWT auto-injection from localStorage; dev test role via `x-test-role` header when no token is present.

Active routes:
```
/dashboard          → Dashboard
/anomaly            → AnomalyDetection
/forecast           → ForecastPage
/analytics/forecast → ForecastPage (alias)
/risk               → RiskPage
/reports/builder    → ReportBuilder
/reports/history    → ReportHistory
/reports/schedules  → ReportSchedules
/settings           → PlaceholderPage
/support            → PlaceholderPage
```

---

## Completed Work — ML Service (Python FastAPI)

### Endpoints and Security

| Endpoint                     | Auth          | Purpose                                            |
|------------------------------|---------------|----------------------------------------------------|
| `GET /health`                | Public        | Health check                                       |
| `POST /ml/anomaly/predict`   | x-service-key | Batch anomaly scoring                              |
| `POST /ml/forecast/predict`  | x-service-key | Prophet forecast generation                        |
| `POST /ml/risk/score`        | x-service-key | Department risk scoring                            |
| `POST /ml/models/train`      | x-service-key | Trigger Isolation Forest retraining (subprocess)   |

Security: `x-service-key` header must match `SERVICE_KEY` env var. Invalid key returns 401.

### Isolation Forest (Anomaly Detection)

- Training: `training/train_isolation_forest.py` (14.3 KB)
- StandardScaler applied to 6-feature matrix: cycleTimeHours, rejectionCount, revisionCount, daysOverSLA, stageCount, hourOfDaySubmitted.
- Model persisted to `models/anomaly/` (isolation_forest.pkl + scaler.pkl).
- Inference service (`app/services/anomaly_service.py`): Loads model/scaler once, returns anomalyScore, isAnomaly, severity per decision.

### Prophet (Predictive Forecasting)

- Training: `training/train_prophet.py` (9.7 KB)
- Models stored per department and target in `models/forecast/`.
- Supported targets: volume, delay, approval_rate, rejection_rate, pending_workload, sla_misses.
- Supported horizons: 7, 14, 30 days.
- Inference service (`app/services/forecast_service.py`): Returns ds, yhat, yhat_lower, yhat_upper for each forecast point.

### Random Forest (Risk Scoring)

- Training: `training/train_random_forest.py` (8.0 KB)
- Pipeline uses features: hourOfDaySubmitted, revisionCount, stageCount, department, priority.
- Model persisted to `models/risk/`.
- Inference service (`app/services/risk_service.py`): Returns riskScore, riskLevel, and feature importance scores for explainability.

### Validation and Cleanup

| Script                                | Purpose                                                                                                          |
|---------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `validation/validate_data.py`         | Checks record count, date range, feature completeness, value sanity, department coverage, anomaly preview ratio  |
| `training/validate_live_inference.py`  | Live inference validation — generates diagnostic plots                                                           |
| `training/cleanup_anomalies.py`       | Clean up stale or invalid anomaly records                                                                        |

Generated validation artifacts:
- `training/live_validation_histogram.png`
- `training/live_validation_scatter_map.png`
- `training/live_validation_sanity_test.png`

---

## Testing Infrastructure

Test infrastructure exists across all three layers with dedicated configuration:

### Server Tests (Jest)
- Config: `server/jest.config.js`
- `__tests__/middleware/validateJWT.test.ts` — JWT middleware unit tests
- `__tests__/services/mlService.test.ts` — ML service client tests
- `__tests__/types.test.ts` — Type validation tests

### Client Tests (Vitest)
- Config: `client/vitest.config.ts`
- `__tests__/setup.ts` — Test environment setup
- `__tests__/components/KPICard.test.tsx` — Component tests
- `__tests__/types.test.ts` — Type validation tests
- `__tests__/utils/` — Utility function tests

### ML Service Tests (Pytest)
- Config: `ml_service/pytest.ini`
- `tests/conftest.py` — Shared fixtures
- `tests/test_anomaly_service.py` — Anomaly service tests
- `tests/test_forecast_service.py` — Forecast service tests
- `tests/test_risk_service.py` — Risk service tests

Test commands:
```bash
# Server
cd server && npm test

# Client
cd client && npm test

# ML Service
cd ml_service && pytest
```

Note: Test infrastructure is established but coverage is not comprehensive. Expanding test coverage remains a pending item.

---

## KPI Logic and Data Normalization Notes

- Refactored bottleneck KPI logic to count only pending tasks overdue their SLA (was previously including all pending).
- Normalized all pending tasks in the database: ensured completedAt and cycleTimeHours are null, counts are zero, daysOverSLA is computed live.
- Set compliance logic to treat SLA as 0 for stricter compliance rate calculation.
- Clarified and separated compliance, approval, and bottleneck logic in kpiAggregator.ts.

### Anomaly Count Methodology
- Dashboard shows only unacknowledged anomalies from recent completed decisions (last 30 days).
- Model training scores all data, so training output anomaly count will differ from dashboard.
- Anomaly job runs on schedule (daily 00:00) and at backend startup — dashboard can become stale if data changes between runs.
- Manual re-trigger available via `npm run run:anomaly-job` or `npx ts-node scripts/runAnomalyJob.ts`.

---

## Database Schemas

### m1_decisions
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Decision unique id |
| decisionId | String | Human-readable decision identifier |
| status | String | Decision status |
| department | String | Department code (FI001, HR002, etc.) |
| createdAt | Date | Creation timestamp |
| completedAt | Date | Completion timestamp |
| cycleTimeHours | Number | Processing duration in hours |
| rejectionCount | Number | Number of rejections |
| revisionCount | Number | Number of revisions |
| daysOverSLA | Number | Days over SLA threshold |
| stageCount | Number | Number of workflow stages |
| hourOfDaySubmitted | Number | Hour of submission (0-23) |
| priority | String | Priority level |

### m1_training_decisions
| Field | Type | Description |
|-------|------|-------------|
| decisionId | String | Decision identifier |
| status | String | Decision status |
| department | String | Department code |
| departmentId | String | Department ID (indexed) |
| departmentName | String | Department display name |
| createdAt | Date | Creation timestamp |
| completedAt | Date | Completion timestamp |
| cycleTimeHours | Number | Processing duration |
| rejectionCount | Number | Number of rejections |
| revisionCount | Number | Number of revisions |
| daysOverSLA | Number | Days over SLA |
| stageCount | Number | Number of stages |
| hourOfDaySubmitted | Number | Hour of submission |
| priority | String | Priority level |
| source | String | Data source (default: 'bpi_aggregated') |

### m3_anomalies
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Anomaly unique id |
| decisionId | String | Linked decision identifier |
| anomalyScore | Number | ML-computed anomaly score |
| severity | String | Severity (Low/Medium/High/Critical) |
| isAcknowledged | Boolean | Whether acknowledged |
| acknowledgedBy | String | User who acknowledged |
| acknowledgedAt | Date | When acknowledged |
| featureValues | Object | Feature values for explainability |
| department | String | Department code |

### m3_kpi_snapshots
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Snapshot unique id |
| department | String | Department code |
| snapshotDate | Date | Date of snapshot |
| totalDecisions | Number | Total decisions |
| approved | Number | Approved count |
| rejected | Number | Rejected count |
| pending | Number | Pending count |
| avgCycleTime | Number | Average cycle time |
| complianceRate | Number | Compliance percentage |
| anomalyCount | Number | Number of anomalies |

### m3_forecasts
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Forecast unique id |
| department | String | Department code |
| target | String | Forecast target metric |
| horizon | Number | Forecast horizon (days) |
| forecastDate | Date | Date generated |
| forecast | Array | Forecast data points |

### m3_reports
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Report unique id |
| name | String | Report name |
| type | String | Report type |
| format | String | Output format (PDF/Excel/CSV) |
| status | String | Status (Completed/Failed) |
| filePath | String | Path to generated file |
| createdAt | Date | Creation date |

### m3_report_schedules
| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Schedule unique id |
| name | String | Schedule name |
| cronExpression | String | Cron schedule |
| reportType | String | Type of report to generate |
| format | String | Output format |
| recipients | Array | Email recipients |
| isActive | Boolean | Whether schedule is active |
| lastRun | Date | Last run date |
| nextRun | Date | Next run date |

---

## Installed Libraries

### Client (package.json)

**Runtime:**
- axios, clsx, echarts, echarts-for-react, react, react-dom, react-datepicker, react-router-dom, recharts

**Dev/Build:**
- tailwindcss, postcss, autoprefixer, vite, typescript, eslint, @vitejs/plugin-react

**Testing:**
- vitest, @testing-library/react, @testing-library/jest-dom, jsdom

### Server (package.json)

**Runtime:**
- express, mongoose, redis, ioredis, node-cron, axios, jsonwebtoken, bcrypt, dotenv, cors, helmet, morgan, exceljs, json2csv, jspdf, jspdf-autotable

**Dev/Build:**
- typescript, ts-node, ts-node-dev, @types/* (express, mongoose, cors, morgan, jsonwebtoken, bcrypt, node-cron, redis, ioredis, json2csv, node)

**Testing:**
- jest, ts-jest, @types/jest

### ML Service (requirements.txt)

**Runtime:**
- fastapi, uvicorn, scikit-learn, pandas, numpy, prophet, joblib, pymongo, python-dotenv

**Testing:**
- pytest, pytest-cov

---

## Operational Runbook

### Start backend API
```bash
cd server
npm run dev
```

### Start frontend
```bash
cd client
npm run dev
```

### Start ML service
```bash
cd ml_service
python -m uvicorn main:app --port 8000 --reload
```

### Re-import CSV dataset
```bash
cd server
npx ts-node scripts/importCSV.ts
```

### Import BPI dataset
```bash
cd server
npx ts-node scripts/importBPI.ts
```

### Validate ML data
```bash
cd ml_service
python validation/validate_data.py
```

### Train models
```bash
cd ml_service
python training/train_isolation_forest.py
python training/train_prophet.py
python training/train_random_forest.py
```

### Validate live inference
```bash
cd ml_service
python training/validate_live_inference.py
```

### Run jobs manually
```bash
cd server
npm run run:anomaly-job
npm run run:forecast-job
npm run run:risk-job
```

### Reset database
```bash
cd server
npx ts-node scripts/resetDatabase.ts
```

### Run tests
```bash
# Server
cd server && npm test

# Client
cd client && npm test

# ML Service
cd ml_service && pytest
```

### Generate JWT test token
```bash
cd server
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({ userId:'123', role:'admin', department:'finance' }, process.env.JWT_SECRET || 'test_secret', { expiresIn:'1h' }))"
```

---

## Implementation Status

| Component | Description | Status |
|-----------|-------------|--------|
| Project architecture | Three-tier: React client, Node.js backend, Python FastAPI ML | Complete |
| Core middleware | validateJWT, requireRole, serviceKey | Complete |
| Analytics endpoints | KPI, volume, cycle time, compliance, risk heatmap, forecast | Complete |
| AI routes | Anomaly list (role-based), acknowledge flow, cache | Complete |
| Cache service | Redis read-through with TTL, wildcard invalidation, MongoDB fallback | Complete |
| Event webhooks | Decision-update and compliance-update with cache invalidation | Complete |
| Anomaly pipeline | Cron job, ML call, upsert, API, cache, frontend panel | Complete |
| Forecast pipeline | Multi-target, multi-horizon, ML call, persistence, frontend chart | Complete |
| Risk scoring | Random Forest, cron, API, frontend heatmap/table/pie | Complete |
| Report generation | CSV, Excel, PDF, schedule, download, frontend builder | Complete |
| ML anomaly detection | Isolation Forest training, inference, model persistence | Complete |
| ML forecasting | Prophet training, inference, per-department models | Complete |
| ML risk scoring | Random Forest training, inference, feature importance | Complete |
| Data import (CSV) | CSV ETL with normalization, batching, date shifting | Complete |
| Data import (BPI) | XES processing, BPI aggregation, training collection | Complete |
| Dashboard page | KPI cards, anomaly feed, charts, filters, auto-refresh | Complete |
| Deep Insights page | Anomaly table, severity/dept filters, feature chart, acknowledge | Complete |
| Forecast page | Forecast chart, horizon/target toggles | Complete |
| Risk page | Heatmap, table, pie chart, feature breakdown modal | Complete |
| Report pages | Builder, history, schedules with create/toggle/delete | Complete |
| Test infrastructure | Jest (server), Vitest (client), Pytest (ML) | Complete |
| ML validation | Live inference validation, diagnostic plots, data validation | Complete |
| Database utility scripts | Reset, backfill, manual job triggers | Complete |
| Auth hardening | Remove dev bypass, enforce JWT on all routes | Pending |
| User management UI | Login, role gates, admin screens | Pending |
| Production security | HTTPS, rate limiting, hardening | Pending |
| Retraining automation | Weekly cron for Prophet and Random Forest | Pending |
| Module 2 integration | Risk/compliance feature integration | Pending |
| Redis verification | Runtime cache-hit proof | Pending |
| UI polish | Professional recolor, font pass, new visualizations | Pending |
| Additional analytics pages | Decision, Compliance, Department Performance, KPI Config | Pending |
| Expanded test coverage | Comprehensive tests across all layers | Pending |
| DevOps / CI/CD | Automated deployment, monitoring | Pending |
| Expanded reporting | Templates, widget selection, email delivery | Pending |
