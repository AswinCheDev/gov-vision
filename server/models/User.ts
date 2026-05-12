import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  email: string
  passwordHash: string
  role: "admin" | "manager" | "analyst" | "executive"
  department: string
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "analyst", "executive"], required: true },
    department: { type: String, required: true }
  },
  { timestamps: true }
)

export default mongoose.model<IUser>("User", UserSchema)