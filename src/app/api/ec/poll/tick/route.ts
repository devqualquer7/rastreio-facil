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

    // Group by slot to minimize token decryption
    const slotMap = new Map<number, string>()
    let checked = 0
    let changed = 0

    for (const sale of pending) {
      if (!sale.mp_preference_id) continue

      try {
        if (!slotMap.has(sale.slot)) {
          const cred = await db.getCredBySlot(sale.slot)
          if (!cred) continue
          const token = await decrypt(cred.access_token)
          slotMap.set(sale.slot, token)
        }

        const token = slotMap.get(sale.slot)!
        const api = new MPAPI(token)

        // Search payments by external reference (set at preference creation)
        const payments = await api.searchPayments({ externalReference: sale.external_reference })
        checked++

        if (!payments?.results?.length) continue

        // Get the most recent
        const payment = payments.results[0]
        const newStatus = payment.status // approved, rejected, cancelled, etc.

        if (newStatus && newStatus !== sale.status) {
          await db.updateSale(sale.id, {
            status: newStatus,
            mp_payment_id: payment.id ? String(payment.id) : null,
            payment_type_id: payment.payment_type_id || null,
            net_amount: payment.transaction_details?.net_received_amount ?? null,
          })
          changed++

          // Log status change
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
    }

    return NextResponse.json({ ok: true, checked, changed })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC poll/tick]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
