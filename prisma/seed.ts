import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Credenciais do administrador principal
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || '3411', 12)
  const adminUsername  = process.env.ADMIN_USERNAME || 'foster'

  const admin = await prisma.admin.upsert({
    where:  { username: adminUsername },
    update: { password: hashedPassword },
    create: { username: adminUsername, password: hashedPassword },
  })

  console.log('Admin criado/atualizado:', admin.username)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
