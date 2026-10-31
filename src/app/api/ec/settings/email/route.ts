import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

/** E-mail fixo do comprador: cada operador tem o seu, para não valer para todos os clientes. */
export async function GET() {
  try {
    const { username } = await requireSession()
    const email = await db.getSetting(`fixed_email:${username}`)
    return NextResponse.json({ ok: true, email: email || '' })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json()
    const email = String(body.email || '').trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'E-mail inválido' })
    }
    await db.setSetting(`fixed_email:${username}`, email)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
