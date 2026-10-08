import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { slot } = await req.json()
    if (!slot) return NextResponse.json({ ok: false, error: 'slot obrigatório' })

    const isLocked = (await db.getLockedSlots()).includes(Number(slot))
    if (isLocked && !isEcAdmin(username)) {
      return NextResponse.json({ ok: false, error: 'Conta bloqueada pelo administrador' }, { status: 403 })
    }

    await db.deleteCred(slot)
    // O número do slot pode ser reaproveitado: não deixa o cadeado para a próxima conta
    if (isLocked) await db.setSlotLocked(Number(slot), false).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
