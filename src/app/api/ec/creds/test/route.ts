import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { slot } = await req.json()
    if (!slot) return NextResponse.json({ ok: false, error: 'slot obrigatório' })

    const cred = await db.getCredBySlot(slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Slot não encontrado' })

    const token = await decrypt(cred.access_token)
    const api = new MPAPI(token)
    const me = await api.me()

    if (!me?.id) {
      await db.updateCred(slot, { connected: false, health_status: 'error', last_test_at: new Date().toISOString() })
      return NextResponse.json({ ok: false, error: 'Token inválido' })
    }

    const banned = me.site_status === 'inactive' || me.status === 'blocked'
    await db.updateCred(slot, {
      connected: !banned,
      health_status: banned ? 'banned' : 'ok',
      mp_user_id: String(me.id),
      last_test_at: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: !banned,
      mpUserId: String(me.id),
      nickname: me.nickname || me.first_name,
      banned,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC creds/test]', e)
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
