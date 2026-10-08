import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'
import { requestAutoPix } from '@/lib/ec-autopix'

function genRef(): string {
  return `EC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export async function POST(req: NextRequest) {
  let cred: any = null
  try {
    const { username } = await requireSession()
    const { amount, title, email, selectedMethods, autoPix } = await req.json()

    if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'Valor inválido' })
    if (!title?.trim()) return NextResponse.json({ ok: false, error: 'Título obrigatório' })

    cred = await db.getActiveCredForUser(username)
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa — ative um slot em Credenciais' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta ativa está banida' })

    const token = await decrypt(cred.access_token)
    const api = new MPAPI(token)
    const ref = genRef()

    // Compute MP payment method exclusions based on which methods were deselected
    const ALL_METHODS = ['credit_card', 'debit_card', 'pix', 'boleto', 'loterica', 'prepaid_card']
    const METHOD_TO_TYPES: Record<string, string[]> = {
      credit_card:  ['credit_card'],
      debit_card:   ['debit_card'],
      prepaid_card: ['prepaid_card'],
    }
    const METHOD_TO_METHODS: Record<string, string[]> = {
      pix:      ['pix'],
      boleto:   ['bolbradesco', 'pec'],
      loterica: ['lotex'],
    }
    const chosen = Array.isArray(selectedMethods) && selectedMethods.length > 0
      ? selectedMethods
      : ALL_METHODS
    // Pix automático precisa do Pix habilitado no link, mesmo que tenha sido desmarcado
    const selected = autoPix && !chosen.includes('pix') ? [...chosen, 'pix'] : chosen
    const deselected = ALL_METHODS.filter(m => !selected.includes(m))
    const excludedTypes: string[]   = deselected.flatMap(m => METHOD_TO_TYPES[m]   ?? [])
    const excludedMethods: string[] = deselected.flatMap(m => METHOD_TO_METHODS[m] ?? [])

    // back_urls / auto_return deliberately omitted — they add a "Voltar pra loja"
    // button on mobile that exposes the panel URL to payers
    const preference = await api.createPreference({
      title: title.trim(),
      amount: Number(amount),
      externalReference: ref,
      // No Pix automático o e-mail é preenchido (aleatório) direto no checkout
      ...(email && !autoPix && { payerEmail: email }),
      ...(excludedTypes.length   && { excludedPaymentTypes:   excludedTypes }),
      ...(excludedMethods.length && { excludedPaymentMethods: excludedMethods }),
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

    // Guarda QUEM criou o link (KV) — o poll usa isso pra atribuir aprovado/recusado.
    await db.setSetting(`sale:by:${ref}`, username).catch(() => {})

    const valorBRL = Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await addLog('link', `Link gerado · ${valorBRL} · ${title.trim()} · ${ref}`, `slot #${cred.slot} ${cred.name ?? ''}`, username)

    // Pix automático: o app desktop percorre o checkout e devolve o copia e cola.
    // Falhou? O link acima continua valendo — devolvemos os dois.
    let pix = null
    if (autoPix) {
      pix = await requestAutoPix(preference.init_point)
      await addLog(
        pix.ok ? 'link' : 'error',
        pix.ok ? `Pix automático gerado ${pix.via === 'server' ? 'pela máquina 24h' : 'pelo PC'} · ${valorBRL} · ${ref}` : `Pix automático falhou (${pix.reason}): ${pix.message} · ${ref}`,
        `slot #${cred.slot} ${cred.name ?? ''}`, username
      ).catch(() => {})
    }

    return NextResponse.json({ ok: true, link: preference.init_point, ref, preferenceId: preference.id, pix })
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
