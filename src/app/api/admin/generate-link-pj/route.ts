import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { value, description } = await request.json()

    const valueInCents = Math.round(Number(value) * 100)
    if (!valueInCents || valueInCents < 100) {
      return NextResponse.json({ error: 'Valor mínimo é R$ 1,00' }, { status: 400 })
    }

    const PUSHINPAY_LINKS_PJ_TOKEN = process.env.PUSHINPAY_LINKS_PJ_TOKEN
    if (!PUSHINPAY_LINKS_PJ_TOKEN) {
      return NextResponse.json(
        { error: 'Token PJ de geração de links não configurado' },
        { status: 503 }
      )
    }

    const pixRes = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUSHINPAY_LINKS_PJ_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        value: valueInCents,
        ...(description ? { description } : {}),
      }),
    })

    if (!pixRes.ok) {
      const err = await pixRes.text()
      console.error('Pushinpay generate-link-pj error:', err)
      return NextResponse.json(
        { error: 'Erro ao gerar link de pagamento PJ. Tente novamente.' },
        { status: 502 }
      )
    }

    const pixData = await pixRes.json()

    return NextResponse.json({
      id: pixData.id,
      qrCode: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64,
      value: valueInCents,
    })
  } catch (error) {
    console.error('Generate link PJ error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
