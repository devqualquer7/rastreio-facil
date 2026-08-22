import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Paradise Webhook] Received:', JSON.stringify(body).substring(0, 1000))

    const transactionId = body.transaction_id
    const status = (body.status || '').toString().toLowerCase()

    console.log(`[Paradise Webhook] Transaction: ${transactionId} | Status: ${status}`)

    if (status === 'approved') {
      console.log(`[Paradise Webhook] Payment APPROVED for transaction ${transactionId}`)
      if (transactionId) {
        try {
          await db.markSaquePaymentPaid(String(transactionId))
          console.log(`[Paradise Webhook] Saque marked paid for ${transactionId}`)
        } catch (e) {
          console.error('[Paradise Webhook] Failed to mark saque paid:', e)
        }
      }
    } else if (status === 'refunded') {
      console.log(`[Paradise Webhook] Payment REFUNDED for transaction ${transactionId}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Paradise Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
