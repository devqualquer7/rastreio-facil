import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { slot } = await req.json()
    if (!slot) return NextResponse.json({ ok: false, error: 'slot obrigatório' })

    const cred = await db.getCredBySlot(slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Slot não encontrado' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta banida' })
    if (!isEcAdmin(username) && (await db.getLockedSlots()).includes(Number(slot))) {
      return NextResponse.json({ ok: false, error: 'Conta bloqueada pelo administrador' }, { status: 403 })
    }

    // Seleção INDIVIDUAL — muda só pra este usuário, não mexe nos outros.
    await db.setUserActiveSlot(username, slot)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
