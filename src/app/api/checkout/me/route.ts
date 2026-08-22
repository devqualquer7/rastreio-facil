import { NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'

export async function GET() {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = codb.getUserById(session.coUserId)
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  if (user.is_banned) return NextResponse.json({ error: 'Conta banida' }, { status: 403 })

  return NextResponse.json({
    id: user.id,
    username: user.username,
    isAdmin: Boolean(user.is_admin),
    isBanned: Boolean(user.is_banned),
    createdAt: user.created_at,
  })
}
