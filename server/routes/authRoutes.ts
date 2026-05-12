import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/User"
import { validateJWT } from "../middleware/validateJWT"
import { requireRole } from "../middleware/requireRole"

const router = Router()

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }

  const user = await User.findOne({ email: email.toLowerCase() }).lean()
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" })
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password" })
  }

  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      department: user.department
    },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  )

  return res.json({ accessToken })
})

router.post(
  "/register",
  validateJWT,
  requireRole(["admin"]),
  async (req: Request, res: Response) => {
    const { email, password, role, department } = req.body as {
      email?: string
      password?: string
      role?: "admin" | "manager" | "analyst" | "executive"
      department?: string
    }

    if (!email || !password || !role || !department) {
      return res.status(400).json({ error: "All fields are required" })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() }).lean()
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      department
    })

    return res.status(201).json({
      userId: user._id,
      email: user.email,
      role: user.role,
      department: user.department
    })
  }
)

export default router