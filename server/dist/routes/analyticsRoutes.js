"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateJWT_1 = require("../middleware/validateJWT");
const requireRole_1 = require("../middleware/requireRole");
const cacheService_1 = require("../services/cacheService");
const kpiAggregator_1 = require("../services/kpiAggregator");
const m1Decisions_1 = __importDefault(require("../models/m1Decisions"));
const m2Violations_1 = __importDefault(require("../models/m2Violations"));
const KPI_Snapshot_1 = __importDefault(require("../models/KPI_Snapshot"));
const Forecast_1 = __importDefault(require("../models/Forecast"));
const FORECAST_TARGETS = [
    'volume',
    'delay',
    'approval_rate',
    'rejection_rate',
];
const router = (0, express_1.Router)();
// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary
// Org-wide KPI numbers
// ─────────────────────────────────────────────
router.get('/kpi-summary', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `m3:kpi:org:${today}`;
    const { dateFrom, dateTo } = req.query;
    const startDate = dateFrom ? new Date(dateFrom) : new Date('2024-01-01');
    let endDate = dateTo ? new Date(dateTo) : new Date();
    if (dateTo)
        endDate.setHours(23, 59, 59, 999);
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, () => (0, kpiAggregator_1.aggregateOrgKPI)(startDate, endDate));
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/kpi-summary]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/kpi-summary/:deptId
// Department-level KPI numbers
// ─────────────────────────────────────────────
router.get('/kpi-summary/:deptId', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const { deptId } = req.params;
    const cacheKey = `m3:kpi:${deptId}:${today}`;
    const { dateFrom, dateTo } = req.query;
    const startDate = dateFrom ? new Date(dateFrom) : new Date('2024-01-01');
    let endDate = dateTo ? new Date(dateTo) : new Date();
    if (dateTo)
        endDate.setHours(23, 59, 59, 999);
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, () => (0, kpiAggregator_1.aggregateKPI)(deptId, startDate, endDate));
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/kpi-summary/:deptId]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/decision-volume
// ─────────────────────────────────────────────
router.get('/decision-volume', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { granularity = 'daily', dateFrom, dateTo, deptId } = req.query;
    const cacheKey = `m3:volume:${deptId || 'all'}:${granularity}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const formatMap = {
                daily: '%Y-%m-%d',
                weekly: '%G-W%V',
                monthly: '%Y-%m',
            };
            const format = formatMap[granularity] || '%Y-%m-%d';
            const matchStage = { source: 'ai_workflow' };
            if (dateFrom)
                matchStage.createdAt = { $gte: new Date(dateFrom) };
            if (dateTo)
                matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(dateTo) };
            if (deptId)
                matchStage.departmentId = deptId;
            return m1Decisions_1.default.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format,
                                date: '$createdAt',
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $project: { _id: 0, date: '$_id', count: 1 } },
            ]).exec();
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/decision-volume]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/cycle-time-histogram
// ─────────────────────────────────────────────
router.get('/cycle-time-histogram', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { deptId } = req.query;
    const cacheKey = `m3:cycletime:${deptId || 'all'}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const match = { completedAt: { $exists: true, $ne: null }, source: 'ai_workflow' };
            if (deptId)
                match.departmentId = deptId;
            const decisions = await m1Decisions_1.default
                .find(match)
                .select('cycleTimeHours createdAt completedAt')
                .lean();
            const buckets = { '0-24h': 0, '24-48h': 0, '48-72h': 0, '>72h': 0 };
            for (const d of decisions) {
                const hours = d.cycleTimeHours ||
                    (new Date(d.completedAt).getTime() - new Date(d.createdAt).getTime()) /
                        (1000 * 60 * 60);
                if (hours <= 24)
                    buckets['0-24h']++;
                else if (hours <= 48)
                    buckets['24-48h']++;
                else if (hours <= 72)
                    buckets['48-72h']++;
                else
                    buckets['>72h']++;
            }
            return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/cycle-time-histogram]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/rejection-reasons
// ─────────────────────────────────────────────
router.get('/rejection-reasons', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const cacheKey = `m3:rejections:${dateFrom || 'nd'}:${dateTo || 'nd'}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const match = { source: 'ai_workflow', status: 'rejected' };
            if (dateFrom)
                match.createdAt = { $gte: new Date(dateFrom) };
            if (dateTo)
                match.createdAt = { ...match.createdAt, $lte: new Date(dateTo) };
            const results = await m1Decisions_1.default.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: { $ifNull: ['$rejectionReason', '$departmentName'] },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $project: { _id: 0, name: '$_id', value: '$count' } }
            ]).exec();
            return results.length > 0 ? results : [{ name: 'Department Review', value: 0 }];
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/rejection-reasons]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/top-violated-policies
// ─────────────────────────────────────────────
router.get('/top-violated-policies', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const cacheKey = 'm3:top-violated-policies';
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const results = await m2Violations_1.default.aggregate([
                {
                    $group: {
                        _id: {
                            policyId: { $ifNull: ['$policyId', { $ifNull: ['$policyName', '$severity'] }] },
                            policyName: { $ifNull: ['$policyName', { $ifNull: ['$policyId', '$severity'] }] }
                        },
                        violationCount: { $sum: 1 },
                        departments: { $addToSet: '$department' }
                    }
                },
                { $sort: { violationCount: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        policyId: '$_id.policyId',
                        policyName: '$_id.policyName',
                        violationCount: 1,
                        departments: 1
                    }
                }
            ]).exec();
            return results;
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/top-violated-policies]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/compliance-trend
// ─────────────────────────────────────────────
router.get('/compliance-trend', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { deptIds, dateFrom, dateTo } = req.query;
    const cacheKey = `m3:compliance:${deptIds || 'all'}:${dateFrom || 'nd'}:${dateTo || 'nd'}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const match = {};
            if (dateFrom)
                match.snapshotDate = { $gte: new Date(dateFrom) };
            if (dateTo)
                match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };
            if (deptIds) {
                match.departmentId = { $in: deptIds.split(',') };
            }
            // No filter if no deptIds, so it includes ORG and all departments
            const results = await KPI_Snapshot_1.default.aggregate([
                { $match: match },
                { $sort: { snapshotDate: 1 } },
                {
                    $group: {
                        _id: '$departmentName',
                        data: { $push: { date: '$snapshotDate', complianceRate: '$complianceRate' } },
                    },
                },
                { $project: { department: '$_id', data: 1, _id: 0 } },
            ]).exec();
            // Sort so "Organization Wide" is always first in the legend
            return results.sort((a, b) => {
                if (a.department === "Organization Wide")
                    return -1;
                if (b.department === "Organization Wide")
                    return 1;
                return 0;
            });
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/compliance-trend]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/risk-heatmap
// ─────────────────────────────────────────────
router.get('/risk-heatmap', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { dateFrom, dateTo } = req.query;
    const cacheKey = `m3:riskheatmap:${dateFrom || 'nd'}:${dateTo || 'nd'}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const match = {};
            if (dateFrom)
                match.snapshotDate = { $gte: new Date(dateFrom) };
            if (dateTo)
                match.snapshotDate = { ...match.snapshotDate, $lte: new Date(dateTo) };
            const results = await KPI_Snapshot_1.default.aggregate([
                { $match: match },
                { $sort: { snapshotDate: -1 } },
                {
                    $group: {
                        _id: '$departmentName',
                        Low: { $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] } },
                        Medium: { $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] } },
                        High: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } },
                        Critical: { $sum: { $cond: [{ $eq: ['$riskLevel', 'critical'] }, 1, 0] } },
                        riskScore: { $first: '$riskScore' },
                        riskLevel: { $first: '$riskLevel' },
                        featureImportance: { $first: '$featureImportance' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        department: '$_id',
                        deptId: '$_id',
                        Low: 1,
                        Medium: 1,
                        High: 1,
                        Critical: 1,
                        riskScore: { $ifNull: ['$riskScore', 0] },
                        riskLevel: { $ifNull: ['$riskLevel', 'low'] },
                        featureImportance: { $ifNull: ['$featureImportance', null] },
                    },
                },
            ]).exec();
            // Sort so "Organization Wide" is always first
            return results.sort((a, b) => {
                if (a.department === "Organization Wide")
                    return -1;
                if (b.department === "Organization Wide")
                    return 1;
                return 0;
            });
        });
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/risk-heatmap]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
// ─────────────────────────────────────────────
// GET /api/analytics/forecast
// Forecast data for a department and horizon
// ─────────────────────────────────────────────
router.get('/forecast', validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(['admin', 'manager', 'analyst']), async (req, res) => {
    const { deptId = 'org', horizon = '30', target = 'volume' } = req.query;
    const parsedHorizon = Number.parseInt(horizon, 10);
    const parsedTarget = String(target).toLowerCase();
    if (![7, 14, 30].includes(parsedHorizon)) {
        return res.status(400).json({ error: 'horizon must be 7, 14, or 30' });
    }
    if (!FORECAST_TARGETS.includes(parsedTarget)) {
        return res.status(400).json({
            error: "target must be one of 'volume', 'delay', 'approval_rate', 'rejection_rate', 'pending_workload', or 'sla_misses'",
        });
    }
    const horizonNum = parsedHorizon;
    const targetValue = parsedTarget;
    const cacheKey = `m3:forecast:${deptId}:${targetValue}:${horizonNum}`;
    try {
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 3600, async () => {
            const forecast = await Forecast_1.default.findOne({
                department: deptId,
                target: targetValue,
                horizon: horizonNum,
            }).lean();
            if (!forecast) {
                return null;
            }
            return forecast;
        });
        if (!data) {
            return res.status(404).json({ error: 'No forecast found. Run the forecast job first.' });
        }
        return res.json(data);
    }
    catch (err) {
        console.error('[GET /api/analytics/forecast]', err.message);
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
