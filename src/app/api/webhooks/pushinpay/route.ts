import { NextRequest, NextResponse } from 'next/server'
import { query } from 'A/lib/db'

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY || !to) return
  try {
    await fetch('https://api.resend.com/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'RastreioF��cil <noreply@rastreiofacil.com>',
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
    // Valida token do webhook
    const webhookToken = request.headers.get('x-pushinpay-token')
    const expectedToken = process.env.PUSHIWPAY_WEBHOOK_TOKEN
    if (expectedToken && webhookToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Pushinpay webhook:', JSON.stringify(body))

    // Extrai o ID da transação e status
    const pushinpayId = body.id || body.transaction_id
    const status = body.status?.toLowerCase()

    if (!pushinpayId) return NextResponse.json({ received: true })

    const payment = query.getPaymentByPushinpayId(pushinpayId)
    if (!payment) {
      console.log('Payment not found for pushinpay ID:', pushinpayId)
      return NextResponse.json({ received: true })
    }

    // Só processa pagamentos confirmados
    if (status === 'paid' || status === 'completed' || status === 'approved') {
      if (payment.status === 'paid') {
        return NextResponse.json({ received: true }) // já processado
      }

      query.updatePaymentStatus(payment.id, 'paid')

      const user = query.getUserById(payment.userId)
      if (!user) return NextResponse.json({ received: true })

      // Aplica benefítios
      if (payment.daysToAdd > 0) {
        query.addDaysToUser(payment.userId, payment.daysToAdd)
      }
      if (payment.extraTrackings > 0) {
        query.addTrackingsToUser(payment.userId, payment.extraTrackings)
      }

      console.log(`Pagamento ${payment.id} confirmado para usuário ${user.username}`)

      // Envia e-mail de confirmação
      if (user.email) {
        const updatedUser = query.getUserById(payment.userId)
        const expiresDate = updatedUser?.expiresAt
          ? new Date(updatedUser.expiresAt).toLocaleDateString('pt-BR')
          : 'N/A'

        let benefitHtml = ''
        if (payment.daysToAdd > 0) benefitHtml += `<li>✅ +${payment.daysToAdd} dias adicionados — anova expira�ão: <strong>${expiresDate}</strong></li>`
        if (payment.extraTrackings > 0) benefitHtml += `<li>✅ +${payment.extraTrackings} rastreios extras adicionados ao seu plano</li>`

        await sendEmail(user.email, '✅ Pagamento confirmado ★ RastreioF��cil', `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0d0d18;color:#e2e8f0;border-radius:12px;"
            >
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
