import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
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
          await db.updateCred(cred.slot, {
            connected: false,
            health_status: 'error',
            health_message: 'Resposta inesperada do MP — sem ID de usuário',
            last_test_at: new Date().toISOString(),
          }).catch(() => {})
          continue
        }

        const banned = me.site_status === 'inactive' || me.status === 'blocked'
        const wasHealthy = cred.health_status === 'ok'

        if (banned && wasHealthy) {
          newlyBanned.push(cred.slot)
          await addLog(
            'error',
            `Conta BANIDA: slot #${cred.slot} · ${cred.name || ''} — suspensa pelo Mercado Pago`,
            'health/check'
          ).catch(() => {})
        }

        await db.updateCred(cred.slot, {
          connected: !banned,
          health_status: banned ? 'banned' : 'ok',
          health_message: banned ? 'Conta suspensa pelo Mercado Pago' : undefined,
          last_test_at: new Date().toISOString(),
        }).catch(() => {})
      } catch (e: any) {
        // MP returned 401/403 — token expired or revoked by the account holder
        if (e.status === 401 || e.status === 403) {
          const wasHealthy = cred.health_status === 'ok'
          if (wasHealthy) newlyBanned.push(cred.slot)

          await db.updateCred(cred.slot, {
            connected: false,
            health_status: 'banned',
            health_message: `Token revogado — reconecte via OAuth (${e.message || `HTTP ${e.status}`})`,
            last_test_at: new Date().toISOString(),
          }).catch(() => {})

          if (wasHealthy) {
            await addLog(
              'error',
              `Token revogado: slot #${cred.slot} · ${cred.name || ''} — ${e.message || `HTTP ${e.status}`}`,
              'health/check'
            ).catch(() => {})
          }
        } else {
          // Network error or unexpected — log but don't change health_status
          console.error(`[health check slot ${cred.slot}]`, e)
        }
      }
    }

    return NextResponse.json({ ok: true, checked, newlyBanned })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
