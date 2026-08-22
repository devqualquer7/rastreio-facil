import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

// Gateway definitions — which providers are available and their field schemas
const GATEWAY_DEFS: Record<string, { label: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[] }> = {
  pushinpay: {
    label: 'PushInPay',
    fields: [
      { key: 'token', label: 'Token', placeholder: 'Seu token PushInPay', secret: true },
      { key: 'pix_key', label: 'Chave PIX', placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
    ]
  },
  paradise: {
    label: 'Paradise Pix',
    fields: [
      { key: 'token', label: 'Token', placeholder: 'Seu token Paradise', secret: true },
      { key: 'pix_key', label: 'Chave PIX', placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
    ]
  },
  pixgate: {
    label: 'PixGate',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Sua API Key', secret: true },
      { key: 'pix_key', label: 'Chave PIX', placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
    ]
  },
  blackcat: {
    label: 'BlackCat',
    fields: [
      { key: 'token', label: 'Token', placeholder: 'Seu token BlackCat', secret: true },
      { key: 'pix_key', label: 'Chave PIX', placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
    ]
  },
  pix_estatico: {
    label: 'PIX Estático (QR próprio)',
    fields: [
      { key: 'pix_key', label: 'Chave PIX', placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória' },
      { key: 'beneficiary', label: 'Nome do beneficiário', placeholder: 'Seu nome ou razão social' },
      { key: 'city', label: 'Cidade', placeholder: 'Ex: Sao Paulo' },
    ]
  },
}

function redact(value: string, secret: boolean): string {
  if (!secret || !value) return value
  if (value.length <= 6) return '••••••'
  return value.slice(0, 3) + '••••••' + value.slice(-3)
}

// GET /api/ec/gateways?slot=N — list gateway config for a slot
export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const slot = Number(req.nextUrl.searchParams.get('slot') ?? '0')

    const keys = Object.entries(GATEWAY_DEFS).flatMap(([id, def]) =>
      def.fields.map(f => `gw:${slot}:${id}:${f.key}`)
    ).concat([`gw:${slot}:active`])

    const rows = await db.getSettings(keys)
    const settingsMap = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const activeGw = settingsMap[`gw:${slot}:active`] || ''

    const gateways = Object.entries(GATEWAY_DEFS).map(([id, def]) => {
      const fieldValues: Record<string, string> = {}
      const redacted: Record<string, string> = {}

      for (const f of def.fields) {
        const v = settingsMap[`gw:${slot}:${id}:${f.key}`] ?? ''
        fieldValues[f.key] = v
        redacted[f.key] = redact(v, !!f.secret)
      }

      const configured = Object.values(fieldValues).some(v => v.trim() !== '')
      const isActive = activeGw === id

      return {
        id,
        label: def.label,
        configured,
        isActive,
        fields: def.fields,
        redacted,
      }
    })

    return NextResponse.json({ ok: true, gateways, activeGw })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// POST /api/ec/gateways — save gateway config and set as active
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { slot, gatewayId, fields, setActive } = await req.json()
    if (!slot || !gatewayId) return NextResponse.json({ ok: false, error: 'Parâmetros inválidos' })

    const def = GATEWAY_DEFS[gatewayId]
    if (!def) return NextResponse.json({ ok: false, error: 'Gateway inválido' })

    for (const f of def.fields) {
      const value = fields[f.key] ?? ''
      await db.setSetting(`gw:${slot}:${gatewayId}:${f.key}`, String(value))
    }

    if (setActive) {
      await db.setSetting(`gw:${slot}:active`, gatewayId)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// DELETE /api/ec/gateways — clear gateway config for a slot
export async function DELETE(req: NextRequest) {
  try {
    await requireSession()
    const { slot, gatewayId } = await req.json()
    if (!slot || !gatewayId) return NextResponse.json({ ok: false, error: 'Parâmetros inválidos' })

    const def = GATEWAY_DEFS[gatewayId]
    if (!def) return NextResponse.json({ ok: false, error: 'Gateway inválido' })

    for (const f of def.fields) {
      await db.setSetting(`gw:${slot}:${gatewayId}:${f.key}`, '')
    }

    // If this was the active gateway, clear it
    const activeRow = await db.getSetting(`gw:${slot}:active`)
    if (activeRow === gatewayId) {
      await db.setSetting(`gw:${slot}:active`, '')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
