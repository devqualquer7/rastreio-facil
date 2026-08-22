import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { codb } from '@/lib/checkout-db'
import { createCheckoutSession } from '@/lib/checkout-session'

export async function POST(req: NextRequest) {
  try {
    const { username, password, key } = await req.json()

    if (!username || !password || !key) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    const cleanUser = username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '')
    if (cleanUser.length < 3) {
      return NextResponse.json({ error: 'Usuário deve ter no mínimo 3 caracteres (letras, números, _ ou -)' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    // Validate activation key
    const activationKey = codb.getKeyByValue(key.trim().toUpperCase())
    if (!activationKey) return NextResponse.json({ error: 'Chave de ativação inválida' }, { status: 400 })
    if (activationKey.used) return NextResponse.json({ error: 'Chave já utilizada' }, { status: 400 })

    // Username must be unique
    const existing = codb.getUserByUsername(cleanUser)
    if (existing) return NextResponse.json({ error: 'Usuário já existe' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 10)
    const user = codb.createUser({ username: cleanUser, password: hashed, is_admin: 0 })
    codb.markKeyUsed(activationKey.id, user.id)

    await createCheckoutSession(user.id, false)

    return NextResponse.json({ success: true, username: user.username })
  } catch (e) {
    console.error('[checkout/auth/register]', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
