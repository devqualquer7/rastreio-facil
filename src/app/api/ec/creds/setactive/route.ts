import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { slot } = await req.json()
    if (!slot) return NextResponse.json({ ok: false, error: 'slot obrigatório' })

    const cred = await db.getCredBySlot(slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Slot não encontrado' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta banida' })

    await db.setAllInactive()
    await db.updateCred(slot, { is_active: true })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
