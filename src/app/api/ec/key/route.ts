// Public route: no auth required — used by the /key page
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'
import { encrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'
import { addLog } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    const { accessToken, name } = await req.json()
    if (!accessToken?.trim()) return NextResponse.json({ ok: false, error: 'Access Token obrigatório' })

    const api = new MPAPI(accessToken.trim())
    const me = await api.me()
    if (!me?.id) return NextResponse.json({ ok: false, error: 'Token inválido no MP' })

    const mpUserId = String(me.id)
    const nickname = me.nickname || me.first_name || name || mpUserId

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

    await addLog('info', `Nova credencial via /key: ${credName} (MP ${mpUserId})`, `slot #${slot}`)

    return NextResponse.json({ ok: true, slot, name: credName, mpUserId })
  } catch (e: any) {
    console.error('[EC key]', e)
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
