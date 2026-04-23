import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 })
    }

    const { value, description } = await request.json()

    const valueInCents = Math.round(Number(value) * 100)
    if (!valueInCents || valueInCents < 100) {
      return NextResponse.json({ error: 'Valor m\u00ednimo \u00e9 R$ 1,00' }, { status: 400 })
    }

    const PARADISE_API_KEY = process.env.PARADISE_API_KEY
    if (!PARADISE_API_KEY) {
      return NextResponse.json(
        { error: 'API Key da Paradise n\u00e3o configurada' },
        { status: 503 }
      )
    }

    const uid = randomUUID().substring(0, 8).toUpperCase()
    const reference = 'RF-' + uid

    // Gerar dados unicos para cada PIX evitar deduplicacao da Paradise
    const uniqueEmail = 'cliente' + uid + '@pagamento.com'
    const uniqueDoc = String(10000000000 + Math.floor(Math.random() * 89999999999))
    const uniquePhone = '11' + String(900000000 + Math.floor(Math.random() * 99999999))

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
          name: 'Cliente ' + uid,
          email: uniqueEmail,
          document: uniqueDoc,
          phone: uniquePhone,
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
