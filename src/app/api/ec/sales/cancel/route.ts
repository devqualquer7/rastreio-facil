import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { ref } = await req.json()

    if (!ref) return NextResponse.json({ ok: false, error: 'Referência obrigatória' })

    const sale = await db.getSaleByRef(ref)
    if (!sale) return NextResponse.json({ ok: false, error: 'Venda não encontrada' })
    if (!sale.mp_preference_id) return NextResponse.json({ ok: false, error: 'ID da preferência MP não encontrado' })

    // Don't cancel an already-paid or already-cancelled sale
    if (sale.status === 'approved') {
      return NextResponse.json({ ok: false, error: 'Não é possível cancelar um link já pago' })
    }
    if (sale.status === 'cancelado') {
      return NextResponse.json({ ok: false, error: 'Link já foi cancelado' })
    }

    const cred = await db.getCredBySlot(sale.slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Credencial do slot não encontrada' })

    const token = await decrypt(cred.access_token)
    const api = new MPAPI(token)

    // Expire the preference in MP (sets expiration_date_to to the past)
    await api.expirePreference(sale.mp_preference_id)

    // Update sale status in DB
    await db.updateSale(sale.id, { status: 'cancelado' })

    const valorBRL = Number(sale.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await addLog(
      'error',
      `Link cancelado · ${valorBRL} · ${sale.title} · ${ref}`,
      `slot #${sale.slot} ${sale.slot_name ?? ''}`,
      username
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    }
    console.error('[EC sales/cancel]', e)
    await addLog('error', `Erro ao cancelar link: ${e.message}`, 'sales/cancel').catch(() => {})
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
