import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

function genRef(): string {
  return `EC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { amount, title, email } = await req.json()

    if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'Valor inválido' })
    if (!title?.trim()) return NextResponse.json({ ok: false, error: 'Título obrigatório' })

    const cred = await db.getActiveCred()
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta ativa está banida' })

    const token = await decrypt(cred.access_token)
    const api = new MPAPI(token)
    const ref = genRef()

    const base = process.env.NEXT_PUBLIC_BASE_URL || ''
    const preference = await api.createPreference({
      title: title.trim(),
      amount: Number(amount),
      externalReference: ref,
      ...(email && { payerEmail: email }),
      backUrls: {
        success: `${base}/checkout`,
        failure: `${base}/checkout`,
        pending: `${base}/checkout`,
      },
      autoReturn: 'approved',
    })

    if (!preference?.init_point) {
      await addLog('error', `Falha ao criar preferência MP: ${JSON.stringify(preference)}`, 'sales/generate')
      return NextResponse.json({ ok: false, error: 'Falha ao criar link no MP' })
    }

    await db.upsertSale({
      external_reference: ref,
      slot: cred.slot,
      slot_name: cred.name,
      mp_preference_id: String(preference.id),
      title: title.trim(),
      amount: Number(amount),
      status: 'gerado',
      link: preference.init_point,
      payment_type_id: null,
      net_amount: null,
    })

    await addLog('info', `Link gerado: ${ref} · R$${amount} · ${title}`, `slot #${cred.slot}`)

    return NextResponse.json({ ok: true, link: preference.init_point, ref, preferenceId: preference.id })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC sales/generate]', e)
    await addLog('error', `Erro ao gerar link: ${e.message}`, 'sales/generate').catch(() => {})
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
