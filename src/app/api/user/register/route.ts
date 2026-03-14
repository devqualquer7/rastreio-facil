import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from 'A/lib/db'
import { createUserSession } from 'A/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, key } = await request.json()

    if (!username || !password || !key) {
      return NextResponse.json({ error: 'Username, senha e key são obrigatórios' }, { status: 400 })
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username deve ter ao menos 3 caracteres' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
    }

    // Valida key
    const regKey = query.getKeyByValue(key.trim().toUpperCase())
    if (!regKey) {
      return NextResponse.json({ error: 'Key inválida. Verifique e tente novamente.' }, { status: 400 })
    }
    if (regKey.used) {
      return NextResponse.json({ error: 'Esta key já foi utilizada.' }, { status: 400 })
    }

    // Verifica username único
    const existingUser = query.getUserByUsername(username.trim().toLowerCase())
    if (existingUser) {
      return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 400 })
    }

    // Cria conta com 30 dias de acesso
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const hashedPassword = await bcrypt.hash(password, 12)
    const user = query.createUser({
      username: username.trim().toLowerCase(),
      email: email?.trim() || undefined,
      password: hashedPassword,
      registrationKeyId: regKey.id,
      expiresAt: expiresAt.toISOString(),
    })

    // Marca key como usada
    query.markKeyUsed(regKey.id, user.id)

    // Cria sessão
    await createUserSession(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
