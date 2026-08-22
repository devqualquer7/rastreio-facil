import { NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import { decryptCredentials, encryptCredentials } from '@/lib/checkout-crypto'
import { GATEWAY_FIELDS, GATEWAY_LABELS, SUPPORTED_GATEWAYS } from '@/lib/checkout-gateways'

export async function GET() {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const rows = codb.getGatewaysByUser(session.coUserId)
  const result = SUPPORTED_GATEWAYS.map(gw => {
    const row = rows.find(r => r.gateway === gw)
    const fields = GATEWAY_FIELDS[gw]
    let configured = false
    let redacted: Record<string, string> = {}

    if (row) {
      const creds = decryptCredentials(row.credentials)
      configured = Boolean(creds)
      // Return redacted values (mask all but last 4 chars)
      if (creds) {
        redacted = Object.fromEntries(
          Object.entries(creds).map(([k, v]) => [k, '•'.repeat(Math.max(0, v.length - 4)) + v.slice(-4)])
        )
      }
    }

    return {
      id: gw,
      label: GATEWAY_LABELS[gw],
      configured,
      fields,
      redacted,
    }
  })

  return NextResponse.json(result)
}
