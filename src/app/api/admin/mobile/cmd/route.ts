/**
 * Mobile Command Dispatcher
 *
 * The mobile UI calls this when the user clicks "Generate Link" / "List Sales" / etc.
 *
 * Flow:
 * 1. Mobile is logged in (admin cookie validated by middleware).
 * 2. We generate a unique requestId.
 * 3. We publish the command on the bridge channel via Pusher.
 * 4. We wait (HTTP held open) for the desktop to POST the response back
 *    to /api/admin/bridge-callback. Up to 20 seconds.
 * 5. When response arrives, we send it to mobile.
 *
 * Body:
 *   { bridgeId, command, args? }
 *
 * Response:
 *   200 { ok: true, data: ... }
 *   408 { ok: false, error: "PC offline" } if desktop doesn't respond
 *   500 on any other failure
 */

import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'
import { randomUUID } from 'crypto'
import { sign } from '@/lib/bridge-hmac'
import { awaitResponse } from '@/lib/bridge-state'

function getPusher(): Pusher | null {
  const appId   = process.env.PUSHER_APP_ID
  const key     = process.env.PUSHER_KEY
  const secret  = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || 'sa1'
  if (!appId || !key || !secret) return null
  return new Pusher({ appId, key, secret, cluster, useTLS: true })
}

export async function POST(request: NextRequest) {
  try {
    const pusher = getPusher()
    if (!pusher) {
      return NextResponse.json(
        { ok: false, error: 'PUSHER_* não configurado.' },
        { status: 503 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body inválido.' }, { status: 400 })
    }

    const { bridgeId, command, args } = body || {}
    if (!bridgeId || !command || !/^[a-f0-9]+$/.test(String(bridgeId))) {
      return NextResponse.json({ ok: false, error: 'bridgeId/command inválidos.' }, { status: 400 })
    }

    const reqId = randomUUID()
    const ts = Date.now()
    const channelName = 'presence-bridge-' + bridgeId

    // Sign the envelope so desktop can verify it really came from our server
    const envelopeNoSig = { id: reqId, command, args: args || null, ts }
    const payloadStr = JSON.stringify(envelopeNoSig)
    const sig = sign(payloadStr)
    const envelope = { ...envelopeNoSig, sig }

    // Set up the awaiter BEFORE triggering, to avoid race
    const responsePromise = awaitResponse(reqId, 20_000)

    // Trigger event on the bridge channel — desktop receives via Pusher
    try {
      await pusher.trigger(channelName, 'client-command', envelope)
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: 'Falha ao publicar comando: ' + (e?.message || 'desconhecido') },
        { status: 502 }
      )
    }

    // Wait for desktop to POST back to /api/admin/bridge-callback
    try {
      const result = await responsePromise
      return NextResponse.json(result)
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: e?.message || 'PC offline.' },
        { status: 408 }
      )
    }

  } catch (error: any) {
    console.error('[mobile/cmd]', error)
    return NextResponse.json(
      { ok: false, error: 'Erro: ' + (error?.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
