import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { MPAPI } from '@/lib/ec-mp-api'
import { decrypt } from '@/lib/ec-crypto'

const REFUNDABLE   = new Set(['approved'])
const CANCELLABLE  = new Set(['pending', 'in_process', 'authorized'])

export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()

    const { payment_id } = await req.json()
    if (!payment_id) return NextResponse.json({ ok: false, error: 'payment_id obrigatório' }, { status: 400 })

    const cred = await db.getActiveCredForUser(username)
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa' }, { status: 400 })

    const token = await decrypt(cred.access_token)
    const mp = new MPAPI(token)

    // Fetch current status first
    const payment = await mp.getPayment(String(payment_id))
    const currentStatus: string = payment.status ?? ''

    let result: any
    if (REFUNDABLE.has(currentStatus)) {
      result = await mp.refund(String(payment_id))
    } else if (CANCELLABLE.has(currentStatus)) {
      result = await mp.cancel(String(payment_id))
    } else {
      return NextResponse.json(
        { ok: false, error: `Pagamento com status "${currentStatus}" não pode ser estornado ou cancelado` },
        { status: 422 }
      )
    }

    const action = REFUNDABLE.has(currentStatus) ? 'refunded' : 'cancelled'
    await addLog(
      'refund',
      `${action === 'refunded' ? 'Estorno' : 'Cancelamento'}: pagamento ${payment_id}`,
      `slot #${cred.slot} ${cred.name ?? ''}`,
      username,
    ).catch(() => {})

    return NextResponse.json({ ok: true, action, result })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' }, { status: 500 })
  }
}
