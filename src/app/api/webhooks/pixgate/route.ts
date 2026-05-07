/**
 * PIXGATE Webhook Receiver
 *
 * PIXGATE doesn't have a public status-query endpoint — they only notify
 * us when a payment is confirmed via this webhook (called "postback" in
 * their docs). We persist the event into the existing Payment table
 * (using `pushinpayId` field to store the PIXGATE transaction_id, since
 * the codebase already treats this column as a generic "external txid").
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
import { query } from '@/lib/db'

// Sentinel values used when a PIXGATE webhook arrives but no Payment row
// exists yet (e.g. links generated via /api/admin/generate-batch don't
// pre-create a Payment row). The Payment table requires userId/type, so
// we use these placeholders to keep the row valid.
const BATCH_USER_ID = 'pixgate-batch'
const BATCH_TYPE    = 'pixgate-batch'

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      console.warn('[pixgate-webhook] invalid JSON body')
      return NextResponse.json({ ok: true, note: 'invalid body, ignored' })
    }

    console.log('[pixgate-webhook] received:', JSON.stringify(body).slice(0, 500))

    const transactionId = String(body?.transaction_id || '').trim()
    const status        = String(body?.status || '').trim().toUpperCase()
    const amountRaw     = body?.amount
    const amount        = amountRaw != null && isFinite(Number(amountRaw)) ? Number(amountRaw) : 0

    if (!transactionId || !status) {
      console.warn('[pixgate-webhook] missing transaction_id or status')
      return NextResponse.json({ ok: true, note: 'missing fields' })
    }

    // Map PIXGATE status to our internal Payment status
    // PIXGATE: PAID | PENDING | CANCELLED | REVERSED
    // Our DB:  paid | pending | expired   | reversed
    let internalStatus: string
    if (status === 'PAID') {
      internalStatus = 'paid'
    } else if (status === 'CANCELLED' || status === 'CANCELED') {
      internalStatus = 'expired'
    } else if (status === 'REVERSED') {
      internalStatus = 'reversed'
    } else {
      internalStatus = 'pending'
    }

    // Check if we already have a Payment row for this transaction_id
    // (using pushinpayId column — it's a generic external_txid in this codebase)
    const existing = query.getPaymentByPixgateId(transactionId)

    if (existing) {
      // Update status (handles retries + chargebacks PAID→REVERSED)
      query.updatePaymentStatus(existing.id, internalStatus)
      console.log(`[pixgate-webhook] ✓ updated ${transactionId} → ${internalStatus}`)
    } else {
      // First time we see this transaction → create a new Payment row.
      // The Payment table requires userId + type; we use sentinel values
      // since this payment came from a batch saque (not a user purchase).
      // Amount in DB is INTEGER (cents) — convert from PIXGATE's REAIS.
      const amountInCents = Math.round(amount * 100)

      query.createPayment({
        userId:      BATCH_USER_ID,
        type:        BATCH_TYPE,
        amount:      amountInCents,
        pushinpayId: transactionId,
      })

      // createPayment forces status='pending', so update if needed
      if (internalStatus !== 'pending') {
        const created = query.getPaymentByPixgateId(transactionId)
        if (created) {
          query.updatePaymentStatus(created.id, internalStatus)
        }
      }

      console.log(`[pixgate-webhook] ✓ created ${transactionId} → ${internalStatus}`)
    }

    return NextResponse.json({ ok: true })

  } catch (error: any) {
    console.error('[pixgate-webhook] error:', error)
    // Always return 200 to PIXGATE so they don't keep retrying.
    return NextResponse.json({ ok: true, note: 'handled with error' })
  }
}

// PIXGATE may send a GET to test the URL — answer politely
export async function GET() {
  return NextResponse.json({ ok: true, message: 'PIXGATE webhook endpoint ready' })
}
