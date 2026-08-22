import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

export async function POST() {
  try {
    await requireSession()

    const pending = await db.getPendingSales()
    if (pending.length === 0) return NextResponse.json({ ok: true, checked: 0, changed: 0 })

    // Pre-load all unique slot credentials in parallel to avoid sequential DB+decrypt round-trips
    const slotMap = new Map<number, string>()
    const toCheck = pending.filter(s => s.mp_preference_id)
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
          await addLog(
            logType,
            `Status alterado: ${sale.external_reference} · ${sale.status} → ${newStatus} · R$${sale.amount}`,
            `slot #${sale.slot} ${sale.slot_name ?? ''}`
          ).catch(() => {})
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
