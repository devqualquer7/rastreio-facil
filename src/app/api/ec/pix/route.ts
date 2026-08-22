import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { gatewayCreatePix, isValidGateway } from '@/lib/checkout-gateways'

// Fields each gateway needs — must match checkout-gateways.ts creds usage
const GW_FIELDS: Record<string, string[]> = {
  pushinpay: ['api_key'],
  paradise:  ['api_key', 'product_hash'],
  pixgate:   ['api_key'],
  blackcat:  ['api_key'],
}

// POST /api/ec/pix — generate a dynamic PIX QR via the user's configured gateway
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { amount, description } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Valor inválido' }, { status: 400 })
    }

    // Get the active gateway for this user
    const activeGw = await db.getSetting(`gw:user:${username}:active`)
    if (!activeGw || !isValidGateway(activeGw) || activeGw === 'pix_estatico') {
      return NextResponse.json({ ok: false, error: 'Nenhum gateway dinâmico configurado' }, { status: 400 })
    }

    const fields = GW_FIELDS[activeGw]
    if (!fields) return NextResponse.json({ ok: false, error: 'Gateway sem suporte a PIX dinâmico' }, { status: 400 })

    // Read all credentials for this gateway
    const keys = fields.map(f => `gw:user:${username}:${activeGw}:${f}`)
    const rows = await db.getSettings(keys)
    const settingsMap = Object.fromEntries(rows.map(r => [r.key, r.value]))

    const creds: Record<string, string> = {}
    for (const f of fields) {
      const val = settingsMap[`gw:user:${username}:${activeGw}:${f}`] ?? ''
      if (!val.trim()) {
        return NextResponse.json({ ok: false, error: `Gateway ${activeGw}: credencial "${f}" não configurada` }, { status: 400 })
      }
      creds[f] = val
    }

    // Amount in cents
    const amountCents = Math.round(amount * 100)

    const result = await gatewayCreatePix(activeGw, creds, amountCents, description)

    return NextResponse.json({
      ok: true,
      pixCode: result.pix_code,
      pixBase64: result.pix_base64,
      externalId: result.external_id,
      gateway: activeGw,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro ao gerar PIX' }, { status: 500 })
  }
}
