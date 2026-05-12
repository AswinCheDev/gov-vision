import mongoose, { Schema } from "mongoose"

const KPIConfigSchema = new Schema(
  {
    kpiName: { type: String, required: true, unique: true },
    targetValue: { type: Number, required: true },
    warningThresholdPct: { type: Number, required: true },
    criticalThresholdPct: { type: Number, required: true },
    defaultTargetValue: { type: Number, required: true }
  },
  { timestamps: true }
)

export default mongoose.model("KPIConfig", KPIConfigSchema)