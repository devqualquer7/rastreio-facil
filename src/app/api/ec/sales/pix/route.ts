import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'

function genRef(): string {
  return `EC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

/** Gera o Pix direto pela API de Orders. A confirmação segue pelo poll, via external_reference. */
export async function POST(req: NextRequest) {
  let cred: any = null
  try {
    const { username } = await requireSession()
    const { amount, title, email } = await req.json()
    const payerEmail = String(email || '').trim()

    if (!amount || amount <= 0) return NextResponse.json({ ok: false, error: 'Valor inválido' })
    if (!title?.trim()) return NextResponse.json({ ok: false, error: 'Título obrigatório' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return NextResponse.json({ ok: false, error: 'Informe o e-mail do comprador para gerar o Pix' })
    }

    cred = await db.getActiveCredForUser(username)
    if (!cred) return NextResponse.json({ ok: false, error: 'Nenhuma conta ativa — ative um slot em Credenciais' })
    if (cred.health_status === 'banned') return NextResponse.json({ ok: false, error: 'Conta ativa está banida' })

    const startedAt = Date.now()
    const ref = genRef()
    const api = new MPAPI(await decrypt(cred.access_token))
    const order = await api.createPixOrder({ amount: Number(amount), externalReference: ref, payerEmail })
    const method = order?.transactions?.payments?.[0]?.payment_method
    const code: string | undefined = method?.qr_code

    if (!code) {
      await addLog('error', `Order sem código Pix: ${JSON.stringify(order)}`, 'sales/pix')
      return NextResponse.json({ ok: false, error: 'O Mercado Pago não devolveu o código Pix' })
    }

    const qrBase64 = method.qr_code_base64
      ? `data:image/png;base64,${method.qr_code_base64}`
      : await QRCode.toDataURL(code, { margin: 1, width: 320 })

    await db.upsertSale({
      external_reference: ref,
      slot: cred.slot,
      slot_name: cred.name,
      mp_preference_id: null,
      title: title.trim(),
      amount: Number(amount),
      status: 'gerado',
      link: null,
      payment_type_id: null,
      net_amount: null,
    })

    const valorBRL = Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await Promise.all([
      db.setSetting(`sale:by:${ref}`, username).catch(() => {}),
      db.setSetting(`sale:order:${ref}`, String(order.id)).catch(() => {}),
      addLog('link', `Pix gerado · ${valorBRL} · ${title.trim()} · ${ref} · ${((Date.now() - startedAt) / 1000).toFixed(1)}s`, `slot #${cred.slot} ${cred.name ?? ''}`, username),
    ])

    return NextResponse.json({ ok: true, ref, pix: { ok: true, code, qrBase64 } })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    }

    // Só o 401 indica token inválido; um 403 pode ser recusa da conta para este tipo de pagamento.
    if (e.status === 401) {
      if (cred?.slot != null) {
        await db.updateCred(cred.slot, {
          health_status: 'error',
          health_message: 'Token expirado — reconecte a conta via OAuth',
        }).catch(() => {})
      }
      await addLog('error', `Token MP expirado no slot #${cred?.slot ?? '?'}`, 'sales/pix').catch(() => {})
      return NextResponse.json({ ok: false, error: 'Token expirado — reconecte a conta no painel de Credenciais' })
    }

    console.error('[EC sales/pix]', e)
    await addLog('error', `Erro ao gerar Pix: ${e.message}`, `slot #${cred?.slot ?? '?'}`).catch(() => {})
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
