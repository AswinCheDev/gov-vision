"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Anomaly_1 = __importDefault(require("../models/Anomaly"));
const KPI_Snapshot_1 = __importDefault(require("../models/KPI_Snapshot"));
const cacheService_1 = require("../services/cacheService");
const validateJWT_1 = require("../middleware/validateJWT");
const requireRole_1 = require("../middleware/requireRole");
const router = (0, express_1.Router)();
// Role-based access configuration
const ROLE_ANOMALY_ACCESS = {
    admin: { canView: true, canAcknowledge: true },
    manager: { canView: true, canAcknowledge: true },
    executive: { canView: false, canAcknowledge: false },
    analyst: { canView: true, canAcknowledge: true }
};
router.get("/anomalies", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "executive", "analyst"]), async (req, res) => {
    try {
        const userRole = req.user?.role || 'analyst';
        const roleAccess = ROLE_ANOMALY_ACCESS[userRole.toLowerCase()] || ROLE_ANOMALY_ACCESS.analyst;
        // Executives cannot view anomalies
        if (!roleAccess.canView) {
            return res.json({
                Critical: [],
                High: [],
                Medium: [],
                Low: [],
                total: 0,
                note: `${userRole} role: anomalies access denied`
            });
        }
        const cacheKey = "m3:anomalies:active";
        const data = await (0, cacheService_1.getOrSet)(cacheKey, 300, async () => {
            const anomalies = await Anomaly_1.default.find({ isAcknowledged: false })
                .sort({ anomalyScore: -1 })
                .lean();
            const grouped = {
                Critical: [],
                High: [],
                Medium: [],
                Low: []
            };
            for (const anomaly of anomalies) {
                if (grouped[anomaly.severity]) {
                    grouped[anomaly.severity].push(anomaly);
                }
            }
            return {
                ...grouped,
                total: anomalies.length
            };
        });
        return res.json(data);
    }
    catch (err) {
        console.error("[GET /api/ai/anomalies]", err.message);
        return res.status(500).json({ error: "Failed to fetch anomalies" });
    }
});
router.put("/anomalies/:id/acknowledge", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "executive", "analyst"]), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const updated = await Anomaly_1.default.findByIdAndUpdate(id, {
            $set: {
                isAcknowledged: true,
                acknowledgedBy: userId,
                acknowledgedAt: new Date()
            }
        }, { returnDocument: 'after' });
        if (!updated) {
            return res.status(404).json({ error: "Anomaly not found" });
        }
        await (0, cacheService_1.invalidate)("m3:anomalies:active");
        return res.json(updated);
    }
    catch (err) {
        console.error("[PUT /api/ai/anomalies/:id/acknowledge]", err.message);
        return res.status(500).json({ error: "Failed to acknowledge anomaly" });
    }
});
router.get("/risk-scores", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "analyst"]), async (req, res) => {
    try {
        const snapshots = await KPI_Snapshot_1.default.find({
            source: "ai_workflow",
            departmentId: { $ne: null }
        })
            .sort({ updatedAt: -1 })
            .lean();
        const latestByDept = new Map();
        for (const snapshot of snapshots) {
            const deptKey = String(snapshot.departmentId || snapshot.departmentName || "unknown");
            if (!latestByDept.has(deptKey)) {
                latestByDept.set(deptKey, snapshot);
            }
        }
        const payload = Array.from(latestByDept.values()).map((snapshot) => ({
            departmentId: snapshot.departmentId || "unknown",
            departmentName: snapshot.departmentName || snapshot.departmentId || "Unknown",
            riskScore: Number(snapshot.riskScore ?? 0),
            riskLevel: snapshot.riskLevel || "low"
        }));
        return res.json(payload);
    }
    catch (err) {
        console.error("[GET /api/ai/risk-scores]", err.message);
        return res.status(500).json({ error: "Failed to fetch risk scores" });
    }
});
router.get("/model-status", validateJWT_1.validateJWT, (0, requireRole_1.requireRole)(["admin", "manager", "analyst"]), async (_req, res) => {
    try {
        const latestSnapshot = await KPI_Snapshot_1.default.findOne({ source: "ai_workflow" })
            .sort({ updatedAt: -1 })
            .lean();
        const lastTrained = latestSnapshot?.updatedAt
            ? new Date(latestSnapshot.updatedAt).toISOString()
            : new Date().toISOString();
        return res.json([
            { modelName: "Isolation Forest", lastTrained, confidence: null },
            { modelName: "Prophet", lastTrained, confidence: null },
            { modelName: "Random Forest", lastTrained, confidence: null }
        ]);
    }
    catch (err) {
        console.error("[GET /api/ai/model-status]", err.message);
        return res.status(500).json({ error: "Failed to fetch model status" });
    }
});
exports.default = router;
