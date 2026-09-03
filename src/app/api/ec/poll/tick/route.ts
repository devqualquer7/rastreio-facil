import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'
import { sendPushoverToUser, sendPushoverMirror, type PushEvent } from '@/lib/ec-pushover'
import { sendUtmifyForUser } from '@/lib/ec-utmify'

export async function POST() {
  try {
    await requireSession()

    const pending = await db.getPendingSales()
    if (pending.length === 0) return NextResponse.json({ ok: true, checked: 0, changed: 0 })

    // Pre-load all unique slot credentials in parallel to avoid sequential DB+decrypt round-trips
    const slotMap = new Map<number, string>()
    // getPendingSales já vem ordenado por created_at desc → pega os mais recentes.
    // Cobre "pelo menos os 10 últimos" com folga, sem varrer centenas de links velhos.
    const toCheck = pending.filter(s => s.mp_preference_id).slice(0, 50)
    const uniqueSlots = [...new Set(toCheck.map(s => s.slot))]

    await Promise.allSettled(uniqueSlots.map(async (slot) => {
      try {
        const cred = await db.getCredBySlot(slot)
        if (!cred) return
        const token = await decrypt(cred.access_token)
        slotMap.set(slot, token)
      } catch (e) {
        console.error(`[poll tick cred slot ${slot}]`, e)
      }
    }))

    // Check all pending sales against MP API in parallel
    let checked = 0
    let changed = 0

    await Promise.allSettled(toCheck.map(async (sale) => {
      const token = slotMap.get(sale.slot)
      if (!token) return

      try {
        const api = new MPAPI(token)
        const payments = await api.searchPayments({ externalReference: sale.external_reference })
        checked++

        if (!payments?.results?.length) return

        const payment = payments.results[0]
        const newStatus = payment.status

        if (newStatus && newStatus !== sale.status) {
          await db.updateSale(sale.id, {
            status: newStatus,
            mp_payment_id: payment.id ? String(payment.id) : null,
            payment_type_id: payment.payment_type_id || null,
            net_amount: payment.transaction_details?.net_received_amount ?? null,
          })
          changed++

          const logType = newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'status'
          // Quem gerou o link (KV gravado na geração) — atribui a aprovação/recusa a ele.
          const by = await db.getSetting(`sale:by:${sale.external_reference}`).catch(() => null)
          const valorBRL = Number(sale.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const verbo = newStatus === 'approved' ? 'Pagamento APROVADO' : newStatus === 'rejected' ? 'Pagamento RECUSADO' : `Status → ${newStatus}`
          await addLog(
            logType,
            `${verbo} · ${valorBRL} · ${sale.title ?? sale.external_reference}`,
            `slot #${sale.slot} ${sale.slot_name ?? ''}`,
            by || undefined,
          ).catch(() => {})

          // Push no celular (Pushover) — SÓ pro dono do link, no instante da transição.
          // Como o status já foi gravado acima, nenhum outro tick/usuário reenvia.
          const pushEvent: PushEvent | null =
            newStatus === 'approved' ? 'approved'
            : newStatus === 'rejected' ? 'rejected'
            : (newStatus === 'cancelled' || newStatus === 'refunded') ? 'cancelled'
            : null
          if (pushEvent) {
            const titulo = pushEvent === 'approved' ? '💰 Pagamento aprovado'
              : pushEvent === 'rejected' ? '❌ Pagamento recusado'
              : '⚠ Link cancelado'
            const contaLinha = `Conta: ${sale.slot_name ?? ('slot #' + sale.slot)}`
            await sendPushoverToUser(by, pushEvent, {
              title: titulo,
              message: `${valorBRL} · ${sale.title ?? sale.external_reference}\n${contaLinha}`,
            }).catch(() => {})

            // Cópia silenciosa pro monitor — toda venda de todos, com quem vendeu.
            await sendPushoverMirror(by, pushEvent, {
              title: titulo,
              message: `${valorBRL} · ${sale.title ?? sale.external_reference}\n${contaLinha}${by ? ` · @${by}` : ''}`,
            }).catch(() => {})

            // UTMIFY — só venda APROVADA, individual do dono do link.
            if (pushEvent === 'approved') {
              await sendUtmifyForUser(by, sale).catch(() => {})
            }
          }
        }
      } catch (e) {
        console.error(`[poll tick sale ${sale.id}]`, e)
      }
    }))

    // ── Varredura direta no MP — pega TODA venda aprovada em QUALQUER conta,
    //    mesmo que não esteja no web_sales / mesmo conta inativa. Robusto.
    //    Throttle global via KV pra não rodar por cada cliente (dedup por payId).
    try {
      const lastScan = await db.getSetting('notify:scan:at')
      const now = Date.now()
      if (!lastScan || now - Number(lastScan) > 12000) {
        await db.setSetting('notify:scan:at', String(now))
        await scanApprovedAndNotify()
      }
    } catch (e) { console.error('[notify scan]', e) }

    return NextResponse.json({ ok: true, checked, changed })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC poll/tick]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// Janela de 10 min: só notifica aprovações recentes (não blasta histórico no 1º run).
const NOTIFY_WINDOW_MS = 10 * 60 * 1000

async function scanApprovedAndNotify() {
  const creds = await db.listCreds()
  const live = creds.filter((c: any) => c.health_status !== 'banned' && c.access_token)
  const cutoff = Date.now() - NOTIFY_WINDOW_MS

  await Promise.allSettled(live.map(async (cred: any) => {
    try {
      const token = await decrypt(cred.access_token)
      const api = new MPAPI(token)
      const data = await api.searchPayments({ status: 'approved', limit: 15 })
      const results: any[] = data?.results || []

      for (const p of results) {
        if (p.status !== 'approved') continue
        const apprMs = p.date_approved ? Date.parse(p.date_approved)
          : (p.date_created ? Date.parse(p.date_created) : 0)
        if (!apprMs || apprMs < cutoff) continue // fora da janela → ignora

        const payId = String(p.id)
        const seen = await db.getSetting(`notify:pay:${payId}`).catch(() => null)
        if (seen) continue                         // já notificado → nunca repete
        await db.setSetting(`notify:pay:${payId}`, '1')

        const ref = p.external_reference || ''
        const by = ref ? await db.getSetting(`sale:by:${ref}`).catch(() => null) : null
        const amount = Number(p.transaction_amount || 0)
        const valorBRL = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const titulo = '💰 Pagamento aprovado'
        const desc = p.description || ref || payId
        const msg = `${valorBRL} · ${desc}\nConta: ${cred.name}`

        // dono do link (se conhecido) + cópia silenciosa pro admin (sempre)
        await sendPushoverToUser(by, 'approved', { title: titulo, message: msg }).catch(() => {})
        await sendPushoverMirror(by, 'approved', { title: titulo, message: msg + (by ? ` · @${by}` : '') }).catch(() => {})

        // UTMIFY — só aprovada, do dono
        await sendUtmifyForUser(by, {
          external_reference: ref, mp_payment_id: payId, id: payId,
          title: desc, amount,
          net_amount: p.transaction_details?.net_received_amount ?? null,
          payment_type_id: p.payment_type_id, payment_method_id: p.payment_method_id,
          payer_email: p.payer?.email, created_at: p.date_created, date_approved: p.date_approved,
        }).catch(() => {})

        await addLog('approved', `Pagamento APROVADO · ${valorBRL} · ${desc}`,
          `slot #${cred.slot} ${cred.name ?? ''}`, by || undefined).catch(() => {})
      }
    } catch (e) {
      console.error(`[notify scan slot ${cred.slot}]`, e)
    }
  }))
}
