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
        from: 'RastreioFÃ¡cil <noreply@rastreiofacil.com>',
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

    const body = await request.json()
    console.log('Pushinpay webhook:', JSON.stringify(body))

    // Extrai o ID da transaÃ§Ã£o e status
    const pushinpayId = body.id || body.transaction_id
    const status = body.status?.toLowerCase()

    if (!pushinpayId) return NextResponse.json({ received: true })

    
    const payment = query.getPaymentByPushinpayId(pushinpayId)
    if (!payment) {
      console.log('Payment not found for pushinpay ID:', pushinpayId)
            return NextResponse.json({ received: true })
    }

    // SÃ³ processa pagamentos confirmados
    if (status === 'paid' || status === 'completed' || status === 'approved') {
      if (payment.status === 'paid') {
        return NextResponse.json({ received: true }) // jÃ¡ processado
      }

      query.updatePaymentStatus(payment.id, 'paid')

      const user = query.getUserById(payment.userId)
      if (!user) return NextResponse.json({ received: true })

      // Aplica benefÃ­cios
      if (payment.daysToAdd > 0) {
        query.addDaysToUser(payment.userId, payment.daysToAdd)
      }
      if (payment.extraTrackings > 0) {
        query.addTrackingsToUser(payment.userId, payment.extraTrackings)
      }

      console.log(`Pagamento ${payment.id} confirmado para usuÃ¡rio ${user.username}`)

      // Envia e-mail de confirmaÃ§Ã£o
      if (user.email) {
        const updatedUser = query.getUserById(payment.userId)
        const expiresDate = updatedUser?.expiresAt
          ? new Date(updatedUser.expiresAt).toLocaleDateString('pt-BR')
          : 'N/A'

        let benefitHtml = ''
        if (payment.daysToAdd > 0) benefitHtml += `<li>â +${payment.daysToAdd} dias adicionados â nova expiraÃ§Ã£o: <strong>${expiresDate}</strong></li>`
        if (payment.extraTrackings > 0) benefitHtml += `<li>â +${payment.extraTrackings} rastreios extras adicionados ao seu plano</li>`

        await sendEmail(user.email, 'â Pagamento confirmado â RastreioFÃ¡cil', `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d18;color:#e2e8f0;border-radius:12px;">
            <h2 style="color:#818cf8;margin-bottom:8px;">Pagamento confirmado!</h2>
            <p>OlÃ¡ <strong>${user.username}</strong>, seu pagamento foi processado com sucesso.</p>
            <ul style="margin:16px 0;padding-left:20px;">
              ${benefitHtml}
            </ul>
            <a href="https://www.rastreiofacil.com/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
              Acessar meu painel
            </a>
            <p style="margin-top:24px;font-size:12px;color:#64748b;">RastreioFÃ¡cil â rastreiofacil.com</p>
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
