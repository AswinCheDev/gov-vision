import dotenv from "dotenv"
dotenv.config()

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"

import { connectMongo } from "./config/db"
import { connectRedis } from "./config/redis"
import "./jobs/anomalyJob"
import "./jobs/forecastJob"
import "./jobs/riskScoringJob"
import "./jobs/retrainJob"
import "./jobs/reportScheduleJob"

import analyticsRoutes from "./routes/analyticsRoutes"
import eventRoutes     from "./routes/eventRoutes"
import aiRoutes        from "./routes/aiRoutes"
import reportRoutes    from "./routes/reportRoutes"
import reportTemplateRoutes from "./routes/reportTemplateRoutes"
import authRoutes      from "./routes/authRoutes"
import kpiConfigRoutes from "./routes/kpiConfigRoutes"
import { apiLimiter, authLimiter } from "./middleware/rateLimiter"

const app  = express()
const PORT = process.env.PORT || 5002

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required to start the server")
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean)

/*
  Security and utility middleware.
  These must come BEFORE your routes.
*/
app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error("Not allowed by CORS"))
  }
}))
app.use(morgan("dev"))
app.use(express.json())

// Production should terminate TLS at the reverse proxy layer (nginx/caddy), not in Node.
app.use("/api", apiLimiter)
app.use("/api/auth", authLimiter)

/*
  Mount routes.
  Analytics and AI routes are protected by JWT inside
  the route files themselves.
  Event routes are protected by SERVICE_KEY inside
  the route files themselves.
*/
app.use("/api/analytics", analyticsRoutes)
app.use("/api/auth",     authRoutes)
app.use("/api/admin",    kpiConfigRoutes)
app.use("/api/events",    eventRoutes)
app.use("/api/ai",        aiRoutes)
app.use("/api/reports",   reportRoutes)
app.use("/api/reports",   reportTemplateRoutes)

/*
  Health check — useful to confirm the server is running
  before testing in Postman.
*/
app.get("/health", (req, res) => {
  res.json({ status: "ok", module: "Module 3", port: PORT })
})

/*
  Connect to MongoDB and Redis, then start the server.
*/
async function startServer() {
  try {
    await connectMongo()

    try {
      await connectRedis()
    } catch (error) {
      console.warn("Redis unavailable, running without cache:", error)
    }

    app.listen(PORT, () => {
      console.log(`Module 3 server running on port ${PORT}`)
    })
  } catch (error) {
    console.error("Server startup failed:", error)
    process.exit(1)
  }
}

startServer()