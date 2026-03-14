import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from 'A/lib/db'
import { createUserSession } from 'A/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username e senha obrigatórios' }, { status: 400 })
    }

    const user = query.getUserByUsername(username.trim().toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    await createUserSession(user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User login error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
