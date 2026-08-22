import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Paradise Webhook] Received:', JSON.stringify(body).substring(0, 2000))

    // Paradise may send transaction_id or id
    const transactionId = body.transaction_id ?? body.id ?? body.txid
    const status = (body.status || body.event || '').toString().toLowerCase()

    console.log(`[Paradise Webhook] transactionId: ${transactionId} | status: ${status}`)

    const isPaid = status === 'approved' || status === 'paid' || status === 'completed' || status === 'transaction.paid'

    if (isPaid) {
      console.log(`[Paradise Webhook] Payment confirmed for transaction ${transactionId}`)
      const ids = [
        transactionId ? String(transactionId) : null,
        body.id ? String(body.id) : null,
        body.reference ? String(body.reference) : null,
      ].filter(Boolean) as string[]
      const uniqueIds = [...new Set(ids)]
      console.log('[Paradise Webhook] Trying markSaquePaymentPaid for IDs:', uniqueIds)
      for (const id of uniqueIds) {
        try {
          const marked = await db.markSaquePaymentPaid(id)
          if (marked) console.log(`[Paradise Webhook] Saque marked paid for ID: ${id}`)
        } catch (e) {
          console.error(`[Paradise Webhook] Failed to mark saque paid for ${id}:`, e)
        }
      }
    } else {
      console.log(`[Paradise Webhook] Status "${status}" — no action`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Paradise Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
