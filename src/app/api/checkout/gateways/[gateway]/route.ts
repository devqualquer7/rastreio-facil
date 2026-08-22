import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import { encryptCredentials } from '@/lib/checkout-crypto'
import { GATEWAY_FIELDS, isValidGateway } from '@/lib/checkout-gateways'

type Ctx = { params: Promise<{ gateway: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { gateway } = await params
  if (!isValidGateway(gateway)) {
    return NextResponse.json({ error: 'Gateway inválida' }, { status: 400 })
  }

  const body = await req.json()
  const fields = GATEWAY_FIELDS[gateway]
  const creds: Record<string, string> = {}

  for (const field of fields) {
    const val = body[field.key]
    if (!val || typeof val !== 'string' || !val.trim()) {
      return NextResponse.json({ error: `Campo obrigatório: ${field.label}` }, { status: 400 })
    }
    creds[field.key] = val.trim()
  }

  const encrypted = encryptCredentials(creds)
  codb.upsertGateway(session.coUserId, gateway, encrypted)

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { gateway } = await params
  if (!isValidGateway(gateway)) {
    return NextResponse.json({ error: 'Gateway inválida' }, { status: 400 })
  }

  codb.deleteGateway(session.coUserId, gateway)
  return NextResponse.json({ success: true })
}
