import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { MPAPI } from '@/lib/ec-mp-api'
import { decrypt } from '@/lib/ec-crypto'

// GET /api/ec/extrato — fetch real payment data from MP API
export async function GET() {
  try {
    await requireSession()

    const cred = await db.getActiveCred()
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa' }, { status: 400 })

    const token = await decrypt(cred.access_token)
    const mp = new MPAPI(token)

    const data = await mp.searchPayments({ limit: 100 })
    const payments: any[] = data.results ?? []

    const sales = payments.map((p: any) => ({
      id: String(p.id),
      external_reference: p.external_reference ?? '',
      title: p.description || `Pagamento #${p.id}`,
      slot: cred.slot,
      slot_name: cred.name,
      created_at: p.date_created,
      amount: p.transaction_amount ?? 0,
      net_amount: p.transaction_details?.net_received_amount ?? null,
      status: p.status ?? 'unknown',
      status_detail: p.status_detail ?? null,
      payment_type_id: p.payment_type_id ?? null,
      payment_method_id: p.payment_method_id ?? null,
      payer_email: p.payer?.email ?? null,
    }))

    return NextResponse.json({ ok: true, sales })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' }, { status: 500 })
  }
}
