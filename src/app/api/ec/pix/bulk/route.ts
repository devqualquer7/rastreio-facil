import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { gatewayCreatePix, isValidGateway } from '@/lib/checkout-gateways'

const GW_FIELDS: Record<string, string[]> = {
  pushinpay: ['api_key'],
  paradise:  ['api_key', 'product_hash'],
  pixgate:   ['api_key'],
  blackcat:  ['api_key'],
}

// POST /api/ec/pix/bulk — generate N dynamic PIX QRs at once
// Body: { amount, quantity?, description?, gatewayId? }
// If gatewayId is provided and valid, it overrides the user's active gateway.
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { amount, quantity = 1, description, gatewayId } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Valor inválido' }, { status: 400 })
    }
    const qty = Math.min(Math.max(Math.floor(quantity), 1), 50)

    // Resolve which gateway to use: explicit gatewayId > active gateway
    let gwToUse: string | null = null

    if (gatewayId && typeof gatewayId === 'string' && isValidGateway(gatewayId)) {
      gwToUse = gatewayId
    } else {
      const activeGw = await db.getSetting(`gw:user:${username}:active`)
      gwToUse = activeGw as string | null
    }

    if (!gwToUse || gwToUse === 'pix_estatico' || !isValidGateway(gwToUse)) {
      return NextResponse.json({ ok: false, error: 'Nenhum gateway dinâmico configurado' }, { status: 400 })
    }

    const fields = GW_FIELDS[gwToUse]
    if (!fields) {
      return NextResponse.json({ ok: false, error: 'Gateway sem suporte a PIX dinâmico' }, { status: 400 })
    }

    const keys = fields.map(f => `gw:user:${username}:${gwToUse}:${f}`)
    const rows = await db.getSettings(keys)
    const settingsMap = Object.fromEntries(rows.map(r => [r.key, r.value]))

    const creds: Record<string, string> = {}
    for (const f of fields) {
      const val = settingsMap[`gw:user:${username}:${gwToUse}:${f}`] ?? ''
      if (!val.trim()) {
        return NextResponse.json({ ok: false, error: `Credencial "${f}" não configurada para o gateway selecionado` }, { status: 400 })
      }
      creds[f] = val
    }

    const amountCents = Math.round(amount * 100)

    // Generate all PIX in parallel
    const results = await Promise.allSettled(
      Array.from({ length: qty }, (_, i) =>
        gatewayCreatePix(gwToUse as any, creds, amountCents, description || `PIX #${i + 1}`)
      )
    )

    const items = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { index: i + 1, ok: true, pixCode: r.value.pix_code, pixBase64: r.value.pix_base64, externalId: r.value.external_id }
      }
      return { index: i + 1, ok: false, error: (r.reason as any)?.message || 'Erro ao gerar' }
    })

    const successCount = items.filter(i => i.ok).length
    return NextResponse.json({ ok: true, items, gateway: gwToUse, successCount, total: qty })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro ao gerar PIX' }, { status: 500 })
  }
}
