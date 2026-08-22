import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

export async function POST() {
  try {
    await requireSession()
    const creds = await db.listCreds()
    const newlyBanned: number[] = []
    let checked = 0

    for (const cred of creds) {
      try {
        const token = await decrypt(cred.access_token)
        const api = new MPAPI(token)
        const me = await api.me()
        checked++

        if (!me?.id) {
          await db.updateCred(cred.slot, { connected: false, health_status: 'error', last_test_at: new Date().toISOString() })
          continue
        }

        const banned = me.site_status === 'inactive' || me.status === 'blocked'
        const wasOk = cred.health_status === 'ok'

        if (banned && wasOk) newlyBanned.push(cred.slot)

        await db.updateCred(cred.slot, {
          connected: !banned,
          health_status: banned ? 'banned' : 'ok',
          last_test_at: new Date().toISOString(),
        })
      } catch (e) {
        console.error(`[health check slot ${cred.slot}]`, e)
      }
    }

    return NextResponse.json({ ok: true, checked, newlyBanned })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
