import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Nova senha deve ter ao menos 6 caracteres' }, { status: 400 })
    }

    const user = query.getUserById(session.userId as string)
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    query.updateUserPassword(user.id, hashed)

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
