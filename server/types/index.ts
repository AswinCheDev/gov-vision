import { Request } from "express"
import type { IUser as ContractUser } from "../../contracts"

/*
  Server TypeScript types for GovVision.
  
  NOTE: Shared API contracts are now in /contracts/index.ts
  and re-exported here for convenience. Server-specific types
  (like Mongoose document extensions) are defined locally.
  
  Import from contracts for shared types:
  import { IKpiSummary, IAnomaly } from '../../contracts'
*/

// Re-export all shared types from contracts for server use
export type {
  Severity,
  RiskLevel,
  IKpiSummary,
  IAnomaly,
  IAnomalyResult,
  IFeatureValues,
  IAnomalyGroup,
  IRiskEntry,
  IRiskHeatmapRow,
  ForecastTarget,
  IForecastPoint,
  IForecastData,
  ReportFormat,
  ReportType,
  ReportStatus,
  IReportConfig,
  IGenerateReportResponse,
  IReportRecord,
  IReportSchedule,
  IFilter,
  IDecisionVolumePoint,
  ICycleTimeBucket,
  IComplianceTrendPoint,
  IComplianceTrendSeries,
  IFeatureImportance,
  IUser,
  RISK_LEVEL_COLORS
} from '../../contracts'

/*
  Declaration merging — adds req.user to Express Request.
  Without this block, TypeScript will error on every
  req.user access in your middleware and routes.
*/
declare global {
  namespace Express {
    interface Request {
      user?: ContractUser
    }
  }
}