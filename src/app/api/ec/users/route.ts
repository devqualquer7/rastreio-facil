import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'

// GET /api/ec/users — list all users
export async function GET() {
  try {
    const me = await requireSession()
    const users = await db.listUsers()
    return NextResponse.json({ ok: true, users, me })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// POST /api/ec/users — create user directly (admin sets username + password)
export async function POST(req: NextRequest) {
  try {
    const me = await requireSession()
    const { username, password } = await req.json()
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json({ ok: false, error: 'Username e senha são obrigatórios' })
    }
    if (username.trim().length < 3) return NextResponse.json({ ok: false, error: 'Username muito curto (mín. 3 chars)' })
    if (password.trim().length < 6) return NextResponse.json({ ok: false, error: 'Senha muito curta (mín. 6 chars)' })

    const existing = await db.getUserByUsername(username.trim())
    if (existing) return NextResponse.json({ ok: false, error: 'Username já existe' })

    const hash = await bcrypt.hash(password.trim(), 12)
    await db.createUser(username.trim(), hash, '')
    await addLog('login', `Admin "${me}" criou usuário "${username.trim()}"`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// DELETE /api/ec/users — delete a user (cannot delete self)
export async function DELETE(req: NextRequest) {
  try {
    const me = await requireSession()
    const { username } = await req.json()
    if (!username) return NextResponse.json({ ok: false, error: 'Username obrigatório' })
    if (username === me) return NextResponse.json({ ok: false, error: 'Você não pode remover a si mesmo' })

    await db.deleteUser(username)
    await addLog('login', `Admin "${me}" removeu usuário "${username}"`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
