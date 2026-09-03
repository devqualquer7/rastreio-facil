import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'
import { sendPushoverToUser, sendPushoverMirror, type PushEvent } from '@/lib/ec-pushover'

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
          }
        }
      } catch (e) {
        console.error(`[poll tick sale ${sale.id}]`, e)
      }
    }))

    return NextResponse.json({ ok: true, checked, changed })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC poll/tick]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
