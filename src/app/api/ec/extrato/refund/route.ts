import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { MPAPI } from '@/lib/ec-mp-api'
import { decrypt } from '@/lib/ec-crypto'

const REFUNDABLE   = new Set(['approved'])
const CANCELLABLE  = new Set(['pending', 'in_process', 'authorized'])

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Body: { payment_id, info?: true, amount?: number }
 *  - info: true  → só consulta quanto ainda pode ser estornado (não altera nada)
 *  - amount      → estorno parcial; omitido ou igual ao disponível = estorno total
 *  - pendente    → cancelamento (amount é ignorado)
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()

    const { payment_id, info, amount } = await req.json()
    if (!payment_id) return NextResponse.json({ ok: false, error: 'payment_id obrigatório' }, { status: 400 })

    const cred = await db.getActiveCredForUser(username)
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa' }, { status: 400 })

    const token = await decrypt(cred.access_token)
    const mp = new MPAPI(token)

    // Fetch current status first
    const payment = await mp.getPayment(String(payment_id))
    const currentStatus: string = payment.status ?? ''
    const total      = Number(payment.transaction_amount) || 0
    const refunded   = Number(payment.transaction_amount_refunded) || 0
    const refundable = Math.max(0, round2(total - refunded))

    if (info) {
      return NextResponse.json({
        ok: true,
        info: { status: currentStatus, amount: total, refunded, refundable },
      })
    }

    let result: any
    let action: 'refunded' | 'partially_refunded' | 'cancelled'
    let refundedNow = refundable

    if (REFUNDABLE.has(currentStatus)) {
      let partial: number | null = null
      if (amount != null) {
        const value = round2(Number(amount))
        if (!Number.isFinite(value) || value <= 0) {
          return NextResponse.json({ ok: false, error: 'Valor de estorno inválido' }, { status: 400 })
        }
        if (value > refundable) {
          const max = refundable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          return NextResponse.json({ ok: false, error: `Valor acima do disponível para estorno (${max})` }, { status: 422 })
        }
        if (value < refundable) partial = value
      }
      if (partial != null) {
        result = await mp.refund(String(payment.id), partial)
        action = 'partially_refunded'
        refundedNow = partial
      } else {
        result = await mp.refund(String(payment.id))
        action = 'refunded'
      }
    } else if (CANCELLABLE.has(currentStatus)) {
      result = await mp.cancel(String(payment.id))
      action = 'cancelled'
    } else {
      return NextResponse.json(
        { ok: false, error: `Pagamento com status "${currentStatus}" não pode ser estornado ou cancelado` },
        { status: 422 }
      )
    }

    const valor = refundedNow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await addLog(
      'refund',
      action === 'cancelled' ? `Cancelamento: pagamento ${payment_id}`
        : action === 'partially_refunded' ? `Estorno parcial de ${valor}: pagamento ${payment_id}`
        : `Estorno total de ${valor}: pagamento ${payment_id}`,
      `slot #${cred.slot} ${cred.name ?? ''}`,
      username,
    ).catch(() => {})

    return NextResponse.json({ ok: true, action, result })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' }, { status: 500 })
  }
}
