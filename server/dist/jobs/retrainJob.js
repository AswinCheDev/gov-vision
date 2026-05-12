"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRetrainJob = runRetrainJob;
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const mlService_1 = require("../services/mlService");
async function runRetrainJob() {
    console.log("[retrainJob] Starting weekly model retraining...");
    try {
        await (0, mlService_1.retrainModels)();
        console.log("[retrainJob] Model retraining triggered successfully.");
        try {
            await axios_1.default.post(`${process.env.MODULE2_BASE_URL}/api/internal/audit/log`, {
                action: "MODEL_RETRAINED",
                performedBy: "system",
                details: "Weekly retraining of Isolation Forest, Prophet, and Random Forest models."
            }, {
                headers: {
                    "x-service-key": process.env.SERVICE_KEY
                }
            });
            console.log("[retrainJob] Audit log written to Module 2.");
        }
        catch (auditError) {
            console.error("[retrainJob] Audit logging failed:", auditError);
        }
    }
    catch (err) {
        console.error("[retrainJob] Retraining failed:", err);
    }
}
node_cron_1.default.schedule("0 3 * * 0", () => {
    runRetrainJob().catch((error) => {
        console.error("[retrainJob] Uncaught cron error:", error);
    });
});
console.log("[retrainJob] Scheduled: weekly on Sunday at 03:00.");
