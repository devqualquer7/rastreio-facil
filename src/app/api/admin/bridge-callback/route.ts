/**
 * Bridge Callback
 *
 * The desktop POSTs here after processing a command, with the result.
 * We correlate by requestId and resolve the awaiting Promise from /api/admin/mobile/cmd.
 *
 * Body must be HMAC-signed with BRIDGE_HMAC_SECRET.
 *
 * Body:
 *   {
 *     id: "uuid-from-original-request",
 *     ok: true | false,
 *     data?: any,
 *     error?: string,
 *     ts: number,
 *     sig: hmac(JSON.stringify({id, ok, data, error, ts}))
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { verify } from '@/lib/bridge-hmac'
import { deliverResponse, deliverError } from '@/lib/bridge-state'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BRIDGE_HMAC_SECRET) {
      return NextResponse.json(
        { ok: false, error: 'BRIDGE_HMAC_SECRET não configurado.' },
        { status: 503 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body inválido.' }, { status: 400 })
    }

    const { id, ok, data, error, ts, sig } = body || {}
    if (!id || typeof ok !== 'boolean' || !ts || !sig) {
      return NextResponse.json({ ok: false, error: 'Campos faltando.' }, { status: 400 })
    }

    // Reject too-old envelopes (60s window)
    if (Math.abs(Date.now() - Number(ts)) > 60_000) {
      return NextResponse.json({ ok: false, error: 'Timestamp expirado.' }, { status: 401 })
    }

    // Verify HMAC against canonical payload
    const canonical = JSON.stringify({ id, ok, data: data ?? null, error: error ?? null, ts })
    if (!verify(canonical, sig)) {
      return NextResponse.json({ ok: false, error: 'Assinatura inválida.' }, { status: 401 })
    }

    // Deliver to the awaiting request
    const delivered = ok
      ? deliverResponse(id, { ok: true, data })
      : deliverError(id, error || 'Erro no PC')

    if (!delivered) {
      // Either timed out or duplicate — not a fatal error from desktop's POV
      return NextResponse.json({ ok: true, note: 'request not awaiting (likely timed out)' })
    }

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('[bridge-callback]', error)
    return NextResponse.json(
      { ok: false, error: 'Erro: ' + (error?.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
