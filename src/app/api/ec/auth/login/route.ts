import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/ec-supabase'
import { addLog } from '@/lib/ec-supabase'
import { createSession, setSessionCookie } from '@/lib/ec-auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) return NextResponse.json({ ok: false, error: 'Campos obrigatórios' })

    const user = await db.getUserByUsername(username)
    if (!user) {
      await addLog('login', `Login falhou: usuário "${username}" não encontrado`, req.headers.get('x-forwarded-for') ?? 'unknown')
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      await addLog('login', `Login falhou: senha incorreta para "${username}"`, req.headers.get('x-forwarded-for') ?? 'unknown')
      return NextResponse.json({ ok: false, error: 'Credenciais inválidas' })
    }

    const token = createSession(username)
    const res = NextResponse.json({ ok: true })
    await setSessionCookie(token)
    await addLog('login', `Login bem-sucedido: "${username}"`, req.headers.get('x-forwarded-for') ?? 'unknown', username)
    return res
  } catch (e: any) {
    console.error('[EC auth/login]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
