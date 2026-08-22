import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { codb } from '@/lib/checkout-db'
import { createCheckoutSession } from '@/lib/checkout-session'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha obrigatórios' }, { status: 400 })
    }

    const user = codb.getUserByUsername(username.toLowerCase().trim())
    if (!user) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    if (user.is_banned) return NextResponse.json({ error: 'Conta banida' }, { status: 403 })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })

    await createCheckoutSession(user.id, Boolean(user.is_admin))

    return NextResponse.json({ success: true, username: user.username, isAdmin: Boolean(user.is_admin) })
  } catch (e) {
    console.error('[checkout/auth/login]', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
