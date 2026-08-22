import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'

export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-webhook-event') || ''
    const body = await request.json()
    console.log('[BlackCat Webhook] Event:', event, '| Body:', JSON.stringify(body).substring(0, 2000))

    const transactionId = body.transaction_id ?? body.id ?? body.txid
    const status = (body.status || '').toString().toLowerCase()

    console.log(`[BlackCat Webhook] transactionId: ${transactionId} | status: ${status} | event: ${event}`)

    const isPaid = event === 'transaction.paid' || status === 'paid' || status === 'completed' || status === 'approved'

    if (isPaid) {
      const ids = [
        transactionId ? String(transactionId) : null,
        body.id ? String(body.id) : null,
        body.sale_id ? String(body.sale_id) : null,
      ].filter(Boolean) as string[]
      const uniqueIds = [...new Set(ids)]
      console.log('[BlackCat Webhook] Trying markSaquePaymentPaid for IDs:', uniqueIds)
      for (const id of uniqueIds) {
        try {
          const marked = await db.markSaquePaymentPaid(id)
          if (marked) console.log(`[BlackCat Webhook] Saque marked paid for ID: ${id}`)
        } catch (e) {
          console.error(`[BlackCat Webhook] Failed to mark saque paid for ${id}:`, e)
        }
      }
    } else {
      console.log(`[BlackCat Webhook] Event "${event}" status "${status}" — no action`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[BlackCat Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
