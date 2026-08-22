import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { encrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { accessToken, name } = await req.json()
    if (!accessToken?.trim()) return NextResponse.json({ ok: false, error: 'Access Token obrigatório' })

    // Validate with MP
    const api = new MPAPI(accessToken.trim())
    const me = await api.me()
    if (!me?.id) return NextResponse.json({ ok: false, error: 'Token inválido no MP' })

    const mpUserId = String(me.id)
    const nickname = me.nickname || me.first_name || name || mpUserId

    // Check if already exists
    const existing = await db.getCredByMpUserId(mpUserId)
    const encToken = await encrypt(accessToken.trim())
    const slot = existing?.slot ?? await db.nextSlot()
    const credName = name?.trim() || nickname

    await db.upsertCred({
      slot,
      name: credName,
      mp_user_id: mpUserId,
      access_token: encToken,
      connected: true,
      health_status: 'ok',
    })

    // Activate if no active cred
    const active = await db.getActiveCred()
    if (!active) {
      await db.setAllInactive()
      await db.updateCred(slot, { is_active: true })
    }

    return NextResponse.json({ ok: true, slot, name: credName, mpUserId })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC creds/save]', e)
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
