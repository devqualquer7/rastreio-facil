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
        from: 'RastreioFácil <noreply@rastreiofacil.com>',
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
    const contentType = request.headers.get('content-type') || ''

    // Valida token do webhook
    const expectedToken = process.env.PUSHINPAY_WEBHOOK_TOKEN
    if (expectedToken) {
      const webhookToken = request.headers.get('x-pushinpay-token')
        || request.headers.get('x-webhook-token')
        || request.headers.get('authorization')?.replace(/^Bearer\\s+/i, '')
      if (webhookToken && webhookToken !== expectedToken) {
        console.warn('[Webhook] Token mismatch — rejecting')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Parseia o body — suporta JSON e application/x-www-form-urlencoded
    const rawBody = await request.text()
    console.log('[Webhook] Content-Type:', contentType)
    console.log('[Webhook] Raw body:', rawBody.substring(0, 500))

    let body: any
    if (contentType.includes('application/json')) {
      try {
        body = JSON.parse(rawBody)
      } catch (e) {
        console.error('[Webhook] JSON parse failed:', e)
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
      }
    } else {
      // PushinPay envia application/x-www-form-urlencoded
      const params = new URLSearchParams(rawBody)
      body = Object.fromEntries(params.entries())
      console.log('[Webhook] Parsed as form-urlencoded:', JSON.stringify(body))
    }

    // Extrai o ID da transação e status
    const pushinpayId = body.id || body.transaction_id || body.txid
    const status = (body.status || '').toLowerCase()
    console.log('[Webhook] pushinpayId:', pushinpayId, '| status:', status)

    if (!pushinpayId) {
      console.warn('[Webhook] No transaction ID found in body')
      return NextResponse.json({ received: true })
    }

    // PushinPay pode enviar ID em case diferente — normaliza para lowercase
    const normalizedId = String(pushinpayId).trim().toLowerCase()
    console.log('[Webhook] Normalized ID for lookup:', normalizedId)

    let payment = query.getPaymentByPushinpayId(normalizedId)

    // Fallback: tenta o ID original (sem normalizar)
    if (!payment) {
      payment = query.getPaymentByPushinpayId(pushinpayId)
    }

    // Fallback: tenta transaction_id se diferente do id principal
    if (!payment && body.transaction_id && body.transaction_id !== pushinpayId) {
      const altId = String(body.transaction_id).trim().toLowerCase()
      payment = query.getPaymentByPushinpayId(altId)
      if (!payment) payment = query.getPaymentByPushinpayId(body.transaction_id)
    }

    if (!payment) {
      console.log('[Webhook] Payment not found for ID:', pushinpayId)
      return NextResponse.json({ received: true })
    }

    console.log('[Webhook] Found payment:', payment.id, '| current status:', payment.status)

    if (status === 'paid' || status === 'completed' || status === 'approved') {
      if (payment.status === 'paid') {
        console.log('[Webhook] Payment already processed')
        return NextResponse.json({ received: true })
      }

      query.updatePaymentStatus(payment.id, 'paid')

      const user = query.getUserById(payment.userId)
      if (!user) return NextResponse.json({ received: true })

      // Aplica benefícios
      if (payment.daysToAdd > 0) {
        query.addDaysToUser(payment.userId, payment.daysToAdd)
      }
      if (payment.extraTrackings > 0) {
        query.addTrackingsToUser(payment.userId, payment.extraTrackings)
      }

      console.log(`[Webhook] Pagamento ${payment.id} confirmado para ${user.username}`)

      // Envia e-mail de confirmação
      if (user.email) {
        const updatedUser = query.getUserById(payment.userId)
        const expiresDate = updatedUser?.expiresAt
          ? new Date(updatedUser.expiresAt).toLocaleDateString('pt-BR')
          : 'N/A'

        let benefitHtml = ''
        if (payment.daysToAdd > 0) benefitHtml += `<li>✅ +${payment.daysToAdd} dias adicionados — nova expiração: <strong>${expiresDate}</strong></li>`
        if (payment.extraTrackings > 0) benefitHtml += `<li>✅ +${payment.extraTrackings} rastreios extras adicionados ao seu plano</li>`

        await sendEmail(user.email, '✅ Pagamento confirmado — RastreioFácil', `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d18;color:#e2e8f0;border-radius:12px;">
            <h2 style="color:#818cf8;margin-bottom:8px;">Pagamento confirmado!</h2>
            <p>Olá <strong>${user.username}</strong>, seu pagamento foi processado com sucesso.</p>
            <ul style="margin:16px 0;padding-left:20px;">
              ${benefitHtml}
            </ul>
            <a href="https://www.rastreiofacil.com/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acessar meu painel
            </a>
            <p style="margin-top:24px;font-size:12px;color:#64748b;">RastreioFácil — rastreiofacil.com</p>
          </div>
        `)
      }
    } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      query.updatePaymentStatus(payment.id, 'failed')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
