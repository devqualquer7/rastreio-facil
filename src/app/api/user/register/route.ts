import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, runTransaction } from '@/lib/db'
import { createUserSession } from '@/lib/session'

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

    const regKey = query.getKeyByValue(key.trim().toUpperCase())
    if (!regKey) {
      return NextResponse.json({ error: 'Key inválida. Verifique e tente novamente.' }, { status: 400 })
    }
    if (regKey.used) {
      return NextResponse.json({ error: 'Esta key já foi utilizada.' }, { status: 400 })
    }

    const existingUser = query.getUserByUsername(username.trim().toLowerCase())
    if (existingUser) {
      return NextResponse.json({ error: 'Este username já está em uso.' }, { status: 400 })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const hashedPassword = await bcrypt.hash(password, 12)

    // Atomic: create user + mark key as used in one transaction
    let user: any
    try {
      user = runTransaction(() => {
        const newUser = query.createUser({
          username: username.trim().toLowerCase(),
          email: email?.trim() || undefined,
          password: hashedPassword,
          registrationKeyId: regKey.id,
          expiresAt: expiresAt.toISOString(),
        })
        query.markKeyUsed(regKey.id, newUser.id)
        return newUser
      })
    } catch (dbError) {
      console.error('DB transaction error:', dbError)
      return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 500 })
    }

    try {
      await createUserSession(user.id)
    } catch (sessionError) {
      console.error('Session error (non-critical):', sessionError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
