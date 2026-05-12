import bcrypt from "bcrypt"
import { connectMongo } from "../config/db"
import User from "../models/User"

async function seedAdminUser() {
  await connectMongo()

  const email = "admin@govvision.local"
  const existingUser = await User.findOne({ email }).lean()

  if (existingUser) {
    console.log("Admin seed user already exists")
    return
  }

  const passwordHash = await bcrypt.hash("Admin1234!", 12)
  await User.create({
    email,
    passwordHash,
    role: "admin",
    department: "Operations"
  })

  console.log("Seeded admin user: admin@govvision.local / Admin1234!")
}

seedAdminUser().catch(error => {
  console.error("Failed to seed admin user:", error)
  process.exit(1)
})