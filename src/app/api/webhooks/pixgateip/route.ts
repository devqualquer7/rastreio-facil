import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RastreioFacil <noreply@rastreiofacil.com>',
        to: [to],
        subject,
        html,
      }),
    })
  } catch (e) {
    console.error('Email error:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[PixGate Webhook] Received:', JSON.stringify(body).substring(0, 500))

    // New PixGate API format:
    // { event: "transaction.paid", transaction_id: "...", status: "PAID", amount: 96.50, acquirer: "..." }
    const pixgateId = body.transaction_id || body.transactionId || body.id
    const status = (body.status || '').toString().toLowerCase()
    const event = body.event || ''

    console.log('[PixGate Webhook] pixgateId:', pixgateId, '| status:', status, '| event:', event)

    if (!pixgateId) {
      console.warn('[PixGate Webhook] No transaction ID found in body')
      return NextResponse.json({ received: true })
    }

    const normalizedId = String(pixgateId).trim()

    // Look up payment by pixgateId
    let payment = query.getPaymentByPixgateId(normalizedId)

    if (!payment) {
      // Try with pushinpayId field as fallback
      payment = query.getPaymentByPushinpayId(normalizedId)
    }

    if (!payment) {
      console.log('[PixGate Webhook] Payment not found for ID:', normalizedId)
      return NextResponse.json({ received: true })
    }

    console.log('[PixGate Webhook] Found payment:', payment.id, '| current status:', payment.status)

    if (status === 'paid' || event === 'transaction.paid') {
      if (payment.status === 'paid') {
        console.log('[PixGate Webhook] Payment already processed')
        return NextResponse.json({ received: true })
      }

      query.updatePaymentStatus(payment.id, 'paid')

      const user = query.getUserById(payment.userId)
      if (!user) return NextResponse.json({ received: true })

      // Apply benefits
      if (payment.daysToAdd > 0) {
        query.addDaysToUser(payment.userId, payment.daysToAdd)
      }
      if (payment.extraTrackings > 0) {
        query.addTrackingsToUser(payment.userId, payment.extraTrackings)
      }

      console.log(`[PixGate Webhook] Payment ${payment.id} confirmed for ${user.username}`)

      // Send confirmation email
      if (user.email) {
        const updatedUser = query.getUserById(payment.userId)
        const expiresDate = updatedUser?.expiresAt
          ? new Date(updatedUser.expiresAt).toLocaleDateString('pt-BR')
          : 'N/A'

        await sendEmail(
          user.email,
          'Pagamento Confirmado - RastreioFacil',
          `<h2>Pagamento Confirmado!</h2>
          <p>Ola ${user.username},</p>
          <p>Seu pagamento foi confirmado com sucesso.</p>
          <p><strong>Plano valido ate:</strong> ${expiresDate}</p>
          <p>Obrigado por usar o RastreioFacil!</p>`
        )
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[PixGate Webhook] Error:', error)
    return NextResponse.json({ received: true })
  }
}
