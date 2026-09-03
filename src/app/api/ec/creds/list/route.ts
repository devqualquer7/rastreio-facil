import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function GET() {
  try {
    const { username } = await requireSession()
    const creds = await db.listCreds()

    // is_active vira PER-USUÁRIO: cada um vê a própria conta ativa destacada.
    const userSlot = await db.getUserActiveSlot(username)
    const globalActive = creds.find((c: any) => c.is_active)?.slot ?? null
    const effective = userSlot ?? globalActive
    const out = creds.map((c: any) => ({ ...c, is_active: c.slot === effective }))

    return NextResponse.json({ ok: true, creds: out, activeSlot: effective })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
