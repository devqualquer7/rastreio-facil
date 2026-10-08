import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

/**
 * Situação de UMA venda, para a janela "Pix/Link gerado" mostrar "PAGO" na hora.
 *
 * Só leitura: consulta o Mercado Pago mas NÃO grava nada. Quem registra a
 * aprovação, dispara Pushover e notificações continua sendo o /api/ec/poll/tick —
 * assim nada é notificado em dobro.
 *
 * Body: { ref }  →  { ok, status, paid, amount?, method? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { ref } = await req.json()
    if (!ref || typeof ref !== 'string') return NextResponse.json({ ok: false, error: 'ref obrigatório' }, { status: 400 })

    const sale = await db.getSaleByRef(ref)
    if (!sale) return NextResponse.json({ ok: false, error: 'Venda não encontrada' }, { status: 404 })
    if (sale.status === 'approved') {
      return NextResponse.json({ ok: true, status: 'approved', paid: true, amount: Number(sale.amount), method: sale.payment_type_id ?? null })
    }

    const cred = await db.getCredBySlot(sale.slot)
    if (!cred) return NextResponse.json({ ok: true, status: sale.status, paid: false })

    const api = new MPAPI(await decrypt(cred.access_token))
    const found = await api.searchPayments({ externalReference: ref })
    const list: any[] = found?.results ?? []
    // Um mesmo link pode ter mais de uma tentativa (ex.: Pix gerado duas vezes) — vale a aprovada
    const approved = list.find(p => p.status === 'approved')
    if (approved) {
      return NextResponse.json({
        ok: true, status: 'approved', paid: true,
        amount: Number(approved.transaction_amount), method: approved.payment_type_id ?? null,
      })
    }
    return NextResponse.json({ ok: true, status: list[0]?.status ?? sale.status, paid: false })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
