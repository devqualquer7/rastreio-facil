import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'

export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-webhook-event') || ''
    const body = await request.json()
    console.log('[BlackCat Webhook] Event:', event, '| Body:', JSON.stringify(body).substring(0, 1000))

    const transactionId = body.transaction_id || body.id || body.txid
    const status = (body.status || '').toString().toLowerCase()

    console.log(`[BlackCat Webhook] Transaction: ${transactionId} | Status: ${status} | Event: ${event}`)

    const isPaid = event === 'transaction.paid' || status === 'paid' || status === 'completed' || status === 'approved'

    if (isPaid && transactionId) {
      try {
        await db.markSaquePaymentPaid(String(transactionId))
        console.log(`[BlackCat Webhook] Saque marked paid for ${transactionId}`)
      } catch (e) {
        console.error('[BlackCat Webhook] Failed to mark saque paid:', e)
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[BlackCat Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
