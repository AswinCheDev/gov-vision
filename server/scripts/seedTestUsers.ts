import bcrypt from "bcrypt"
import { connectMongo } from "../config/db"
import User from "../models/User"

type UserRole = "admin" | "manager" | "analyst" | "executive"

type SeedUser = {
  email: string
  password: string
  role: UserRole
  department: string
}

const TEST_USERS: SeedUser[] = [
  {
    email: "admin@govvision.local",
    password: "Admin1234!",
    role: "admin",
    department: "Operations"
  },
  {
    email: "manager@govvision.local",
    password: "Manager1234!",
    role: "manager",
    department: "Finance"
  },
  {
    email: "analyst@govvision.local",
    password: "Analyst1234!",
    role: "analyst",
    department: "Information Technology"
  },
  {
    email: "executive@govvision.local",
    password: "Executive1234!",
    role: "executive",
    department: "Human Resources"
  }
]

async function seedTestUsers() {
  await connectMongo()

  for (const seedUser of TEST_USERS) {
    const existingUser = await User.findOne({ email: seedUser.email }).lean()

    if (existingUser) {
      console.log(`User already exists: ${seedUser.email}`)
      continue
    }

    const passwordHash = await bcrypt.hash(seedUser.password, 12)

    await User.create({
      email: seedUser.email,
      passwordHash,
      role: seedUser.role,
      department: seedUser.department
    })

    console.log(`Seeded ${seedUser.role}: ${seedUser.email} / ${seedUser.password}`)
  }

  console.log("Finished seeding role-based test users")
}

seedTestUsers().catch(error => {
  console.error("Failed to seed test users:", error)
  process.exit(1)
})
