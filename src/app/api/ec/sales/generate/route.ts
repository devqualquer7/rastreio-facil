import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

function genRef(): string {
  return `EC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export async function POST(req: NextRequest) {
  let cred: any = null
  try {
    await requireSession()
    const { amount, title, email } = await req.json()

    if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'Valor inválido' })
    if (!title?.trim()) return NextResponse.json({ ok: false, error: 'Título obrigatório' })

    cred = await db.getActiveCred()
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa — ative um slot em Credenciais' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta ativa está banida' })

    const token = await decrypt(cred.access_token)
    const api = new MPAPI(token)
    const ref = genRef()

    // Only include back_urls when we have a valid absolute base URL
    // MP rejects relative URLs and returns 400/403 — never pass empty strings
    const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
    const hasValidBase = base.startsWith('http://') || base.startsWith('https://')

    const preference = await api.createPreference({
      title: title.trim(),
      amount: Number(amount),
      externalReference: ref,
      ...(email && { payerEmail: email }),
      ...(hasValidBase ? {
        backUrls: {
          success: `${base}/checkout`,
          failure: `${base}/checkout`,
          pending: `${base}/checkout`,
        },
        autoReturn: 'approved',
      } : {}),
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
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    }

    // MP token expired / revoked — mark cred as needing reconnection
    if (e.status === 403 || e.status === 401) {
      if (cred?.slot != null) {
        await db.updateCred(cred.slot, {
          health_status: 'error',
          health_message: 'Token expirado — reconecte a conta via OAuth',
        }).catch(() => {})
      }
      await addLog('error', `Token MP expirado no slot #${cred?.slot ?? '?'}`, 'sales/generate').catch(() => {})
      return NextResponse.json({ ok: false, error: 'Token expirado — reconecte a conta no painel de Credenciais' })
    }

    console.error('[EC sales/generate]', e)
    await addLog('error', `Erro ao gerar link: ${e.message}`, 'sales/generate').catch(() => {})
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
