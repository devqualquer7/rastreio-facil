import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

/**
 * Bloqueio de contas — só o admin.
 *   { slot, locked }   → tranca/destranca uma conta para os demais usuários
 *   { lockNew }        → contas novas sincronizadas pelo app já chegam trancadas (ou não)
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    if (!isEcAdmin(username)) return NextResponse.json({ ok: false, error: 'Apenas o administrador' }, { status: 403 })

    const body = await req.json()

    if (typeof body.lockNew === 'boolean') {
      await db.setSetting('creds:lock_new', body.lockNew ? '1' : '0')
      return NextResponse.json({ ok: true, lockNew: body.lockNew })
    }

    const slot = Number(body.slot)
    if (!slot || typeof body.locked !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'slot e locked obrigatórios' }, { status: 400 })
    }
    const cred = await db.getCredBySlot(slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Slot não encontrado' }, { status: 404 })

    await db.setSlotLocked(slot, body.locked)
    await addLog(
      'status',
      `Conta ${body.locked ? 'bloqueada' : 'liberada'} para os usuários: slot #${slot} "${cred.name ?? ''}"`,
      `slot #${slot}`, username,
    ).catch(() => {})

    return NextResponse.json({ ok: true, slot, locked: body.locked })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
