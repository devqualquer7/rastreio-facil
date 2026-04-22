import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Paradise Webhook] Received:', JSON.stringify(body).substring(0, 1000))

    const transactionId = body.transaction_id
    const status = (body.status || '').toString().toLowerCase()

    console.log(`[Paradise Webhook] Transaction: ${transactionId} | Status: ${status}`)

    if (status === 'approved') {
      console.log(`[Paradise Webhook] Payment APPROVED for transaction ${transactionId}`)
    } else if (status === 'refunded') {
      console.log(`[Paradise Webhook] Payment REFUNDED for transaction ${transactionId}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Paradise Webhook] Error:', error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
