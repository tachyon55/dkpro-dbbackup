import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables")
  }

  const hashedPassword = bcrypt.hashSync(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
    create: {
      email,
      name: "Admin",
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
    },
  })

  console.log(`Admin user seeded: ${admin.email} (id: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
