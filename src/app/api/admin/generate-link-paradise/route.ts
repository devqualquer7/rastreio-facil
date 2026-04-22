import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { randomUUID } from 'crypto'

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

    const PARADISE_API_KEY = process.env.PARADISE_API_KEY
    if (!PARADISE_API_KEY) {
      return NextResponse.json(
        { error: 'API Key da Paradise não configurada' },
        { status: 503 }
      )
    }

    const reference = 'RF-' + randomUUID().substring(0, 8).toUpperCase()

    const pixRes = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
      method: 'POST',
      headers: {
        'X-API-Key': PARADISE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: valueInCents,
        description: description || 'Pagamento PIX',
        reference,
        productHash: 'prod_41f8d604222951de',
        customer: {
          name: 'Cliente',
          email: 'cliente@pagamento.com',
          document: '00000000000',
          phone: '11999999999',
        },
      }),
    })

    if (!pixRes.ok) {
      const err = await pixRes.text()
      console.error('Paradise generate-link error:', err)
      return NextResponse.json(
        { error: 'Erro ao gerar link de pagamento. Tente novamente.' },
        { status: 502 }
      )
    }

    const pixData = await pixRes.json()

    return NextResponse.json({
      id: String(pixData.transaction_id),
      qrCode: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64,
      value: valueInCents,
    })
  } catch (error) {
    console.error('Generate link paradise error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
