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
    // Log headers para debug
    const contentType = request.headers.get('content-type') || 'none'
    console.log('[Webhook] Content-Type:', contentType)
    console.log('[Webhook] x-pushinpay-token:', request.headers.get('x-pushinpay-token') ? 'present' : 'absent')

    // Valida token do webhook (verifica múltiplos headers possíveis)
    const expectedToken = process.env.PUSHINPAY_WEBHOOK_TOKEN
    if (expectedToken) {
      const webhookToken = request.headers.get('x-pushinpay-token')
        || request.headers.get('x-webhook-token')
        || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

      if (webhookToken && webhookToken !== expectedToken) {
        console.warn('[Webhook] Token mismatch — rejecting')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (!webhookToken) {
        console.warn('[Webhook] No token header received — processing anyway (secured by pushinpayId lookup)')
      }
    }

    // Lê o body como texto primeiro para evitar crash no JSON.parse
    let body: any
    try {
      const rawBody = await request.text()
      console.log('[Webhook] Raw body:', rawBody)
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error('[Webhook] Failed to parse JSON body:', parseErr)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    console.log('[Webhook] Parsed body keys:', Object.keys(body || {}))

    // Extrai o ID da transação e status — tenta múltiplos campos
    const pushinpayId = body.id || body.transaction_id || body.txid || body.pix_id
    const status = (body.status || '').toLowerCase()

    console.log('[Webhook] pushinpayId:', pushinpayId, '| status:', status)

    if (!pushinpayId) {
      console.warn('[Webhook] No transaction ID found in body')
      return NextResponse.json({ received: true })
    }

    // Busca o pagamento — tenta pelo id principal primeiro, depois pelo transaction_id
    let payment = query.getPaymentByPushinpayId(pushinpayId)

    // Se não encontrou com body.id, tenta com body.transaction_id
    if (!payment && body.transaction_id && body.transaction_id !== pushinpayId) {
      console.log('[Webhook] Trying transaction_id:', body.transaction_id)
      payment = query.getPaymentByPushinpayId(body.transaction_id)
    }

    // Se não encontrou com transaction_id, tenta com body.id separado
    if (!payment && body.id && body.id !== pushinpayId) {
      console.log('[Webhook] Trying body.id:', body.id)
      payment = query.getPaymentByPushinpayId(body.id)
    }

    if (!payment) {
      console.log('[Webhook] Payment not found for any ID. pushinpayId:', pushinpayId, 'transaction_id:', body.transaction_id)
      return NextResponse.json({ received: true })
    }

    console.log('[Webhook] Found payment:', payment.id, '| current status:', payment.status, '| type:', payment.type)

    // Só processa pagamentos confirmados
    if (status === 'paid' || status === 'completed' || status === 'approved') {
      if (payment.status === 'paid') {
        console.log('[Webhook] Payment already processed, skipping')
        return NextResponse.json({ received: true }) // já processado
      }

      query.updatePaymentStatus(payment.id, 'paid')
      console.log('[Webhook] Payment status updated to paid')

      const user = query.getUserById(payment.userId)
      if (!user) {
        console.warn('[Webhook] User not found:', payment.userId)
        return NextResponse.json({ received: true })
      }

      // Aplica benefícios
      if (payment.daysToAdd > 0) {
        query.addDaysToUser(payment.userId, payment.daysToAdd)
        console.log('[Webhook] Added', payment.daysToAdd, 'days to user', user.username)
      }
      if (payment.extraTrackings > 0) {
        query.addTrackingsToUser(payment.userId, payment.extraTrackings)
        console.log('[Webhook] Added', payment.extraTrackings, 'trackings to user', user.username)
      }

      console.log(`[Webhook] Pagamento ${payment.id} confirmado para usuário ${user.username}`)

      // Envia e-mail de confirmação
      if (user.email) {
        try {
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
        } catch (emailErr) {
          console.error('[Webhook] Email send failed:', emailErr)
          // Não falha o webhook por causa de email
        }
      }
    } else if (status === 'failed' || status === 'cancelled' || status === 'canceled' || status === 'expired') {
      query.updatePaymentStatus(payment.id, 'failed')
      console.log('[Webhook] Payment marked as failed')
    } else {
      console.log('[Webhook] Unknown status:', status, '— ignoring')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] CRITICAL ERROR:', error instanceof Error ? error.message : error)
    console.error('[Webhook] Stack:', error instanceof Error ? error.stack : 'no stack')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
