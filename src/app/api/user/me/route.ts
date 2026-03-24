import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const user = query.getUserById(session.userId as string)
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const { password: _, ...safeUser } = user
    const now = new Date()
    const expires = user.expiresAt ? new Date(user.expiresAt) : null
    const daysLeft = expires ? Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    return NextResponse.json({ ...safeUser, daysLeft })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
