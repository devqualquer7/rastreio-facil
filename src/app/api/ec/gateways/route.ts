import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

// Gateway definitions — credentials only, no pix_key (pix_estatico is the exception)
const GATEWAY_DEFS: Record<string, { label: string; fields: { key: string; label: string; placeholder: string; secret?: boolean }[] }> = {
  pushinpay: {
    label: 'PushInPay',
    fields: [
      { key: 'api_key', label: 'Token / API Key', placeholder: 'Seu token PushInPay', secret: true },
    ]
  },
  paradise: {
    label: 'Paradise Pix',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'pk_...', secret: true },
      { key: 'product_hash', label: 'Product Hash', placeholder: 'prod_...' },
    ]
  },
  pixgate: {
    label: 'PixGate',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Sua API Key', secret: true },
    ]
  },
  blackcat: {
    label: 'BlackCat',
    fields: [
      { key: 'api_key', label: 'Token / API Key', placeholder: 'Seu token BlackCat', secret: true },
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

// GET /api/ec/gateways — list gateway config for the current user
export async function GET() {
  try {
    const { username } = await requireSession()

    const keys = Object.entries(GATEWAY_DEFS).flatMap(([id, def]) =>
      def.fields.map(f => `gw:user:${username}:${id}:${f.key}`)
    ).concat([`gw:user:${username}:active`])

    const rows = await db.getSettings(keys)
    const settingsMap = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const activeGw = settingsMap[`gw:user:${username}:active`] || ''

    const gateways = Object.entries(GATEWAY_DEFS).map(([id, def]) => {
      const fieldValues: Record<string, string> = {}
      const redacted: Record<string, string> = {}

      for (const f of def.fields) {
        const v = settingsMap[`gw:user:${username}:${id}:${f.key}`] ?? ''
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

// POST /api/ec/gateways — save gateway config for the current user
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { gatewayId, fields, setActive } = await req.json()
    if (!gatewayId) return NextResponse.json({ ok: false, error: 'Parâmetros inválidos' })

    const def = GATEWAY_DEFS[gatewayId]
    if (!def) return NextResponse.json({ ok: false, error: 'Gateway inválido' })

    for (const f of def.fields) {
      const value = fields[f.key] ?? ''
      await db.setSetting(`gw:user:${username}:${gatewayId}:${f.key}`, String(value))
    }

    if (setActive) {
      await db.setSetting(`gw:user:${username}:active`, gatewayId)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// DELETE /api/ec/gateways — clear gateway config for the current user
export async function DELETE(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const { gatewayId } = await req.json()
    if (!gatewayId) return NextResponse.json({ ok: false, error: 'Parâmetros inválidos' })

    const def = GATEWAY_DEFS[gatewayId]
    if (!def) return NextResponse.json({ ok: false, error: 'Gateway inválido' })

    for (const f of def.fields) {
      await db.setSetting(`gw:user:${username}:${gatewayId}:${f.key}`, '')
    }

    // If this was the active gateway, clear it
    const activeRow = await db.getSetting(`gw:user:${username}:active`)
    if (activeRow === gatewayId) {
      await db.setSetting(`gw:user:${username}:active`, '')
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
