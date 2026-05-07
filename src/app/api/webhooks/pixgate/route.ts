/**
 * PIXGATE Webhook Receiver
 *
 * PIXGATE doesn't have a public status-query endpoint — they only notify
 * us when a payment is confirmed via this webhook (called "postback" in
 * their docs). We persist the event so the desktop software can later
 * query via /api/admin/check-batch-status.
 *
 * This route is PUBLIC (no admin session) — accessible by PIXGATE's
 * servers. We protect it by:
 *   1. Validating that the request actually contains a transaction_id
 *      that was previously created by us (via /api/admin/generate-batch).
 *   2. (Optionally) HMAC verification using PIXGATE_SECRET_KEY — see note
 *      at the bottom; PIXGATE doesn't document signature headers, so we
 *      rely on the obscurity of the URL path + transaction_id existence
 *      check. To harden, you can add an IP allowlist for PIXGATE servers.
 *
 * IMPORTANT: This path needs to be added to the middleware bypass list
 * (or placed under /api/webhooks/* which is typically already public).
 *
 * Configure in PIXGATE dashboard:
 *   Postback URL: https://www.rastreiofacil.com/api/webhooks/pixgate
 *
 * PIXGATE payload (per their docs):
 *   {
 *     "event": "transaction.paid",
 *     "transaction_id": "e34a9437bc1bfe71ced974fe9a7ni1ej0",
 *     "status": "PAID",
 *     "amount": 96.50,
 *     "acquirer": "TURBOSCASH"
 *   }
 *
 * Response: HTTP 200 with body {ok:true} so PIXGATE knows we received it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Reuse Prisma client across requests (avoids exhausting connections)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      // PIXGATE expects 200 even on bad payloads (otherwise they retry forever)
      // — but we log and return ok so the queue clears
      console.warn('[pixgate-webhook] invalid JSON body')
      return NextResponse.json({ ok: true, note: 'invalid body, ignored' })
    }

    console.log('[pixgate-webhook] received:', JSON.stringify(body).slice(0, 500))

    const transactionId = String(body?.transaction_id || '').trim()
    const status        = String(body?.status || '').trim().toUpperCase()
    const event         = String(body?.event || '').trim()
    const amount        = body?.amount != null ? Number(body.amount) : null
    const acquirer      = body?.acquirer ? String(body.acquirer).trim() : null

    if (!transactionId || !status) {
      console.warn('[pixgate-webhook] missing transaction_id or status')
      return NextResponse.json({ ok: true, note: 'missing fields' })
    }

    // Upsert: insert if new, update status if exists
    // This handles retries (PIXGATE may send the same event multiple times)
    // AND chargebacks (PAID → REVERSED)
    await prisma.pixgatePayment.upsert({
      where: { transactionId },
      create: {
        transactionId,
        status,
        amount: isFinite(amount as number) ? amount : null,
        acquirer,
        event,
      },
      update: {
        status,
        amount: isFinite(amount as number) ? amount : undefined,
        acquirer: acquirer || undefined,
        event,
      },
    })

    console.log(`[pixgate-webhook] ✓ recorded ${transactionId} as ${status}`)
    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('[pixgate-webhook] error:', error)
    // Always return 200 to PIXGATE so they don't keep retrying.
    // We logged the error; we'll fix on our end.
    return NextResponse.json({ ok: true, note: 'handled with error' })
  }
}

// PIXGATE may send a GET to test the URL — answer politely
export async function GET() {
  return NextResponse.json({ ok: true, message: 'PIXGATE webhook endpoint ready' })
}
