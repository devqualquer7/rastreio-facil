import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

const PLANS = {
  renewal: { label: 'Renovação 30 dias', amount: 9990, daysToAdd: 30, extraTrackings: 0 },
  extra_200: { label: '200 Rastreios Extras', amount: 5990, daysToAdd: 0, extraTrackings: 200 },
  bundle: { label: 'Renovação + 200 Extras', amount: 14990, daysToAdd: 30, extraTrackings: 200 },
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { planType } = await request.json()
    const plan = PLANS[planType as keyof typeof PLANS]
    if (!plan) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    const user = query.getUserById(session.userId as string)
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const PUSHINPAY_TOKEN = process.env.PUSHINPAY_TOKEN
    if (!PUSHINPAY_TOKEN) return NextResponse.json({ error: 'Pagamentos temporariamente indisponíveis' }, { status: 503 })

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.rastreiofacil.com'}/api/webhooks/pushinpay`

    const pixRes = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PUSHINPAY_TOKEN}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ value: plan.amount, webhook_url: webhookUrl }),
    })

    if (!pixRes.ok) {
      const err = await pixRes.text()
      console.error('Pushinpay error:', err)
      return NextResponse.json({ error: 'Erro ao gerar PIX. Tente novamente.' }, { status: 502 })
    }

    const pixData = await pixRes.json()

    const payment = query.createPayment({
      userId: session.userId as string,
      type: planType,
      amount: plan.amount,
      pushinpayId: pixData.id,
      qrCode: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64,
      extraTrackings: plan.extraTrackings,
      daysToAdd: plan.daysToAdd,
    })

    return NextResponse.json({ paymentId: payment.id, qrCode: pixData.qr_code, qrCodeBase64: pixData.qr_code_base64, amount: plan.amount, label: plan.label })
  } catch (error) {
    console.error('Payment create error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
