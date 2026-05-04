import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { value, description } = await request.json()

    const valueInCents = Math.round(Number(value) * 100)
    if (!valueInCents || valueInCents < 100) {
      return NextResponse.json({ error: 'Valor minimo e R$ 1,00' }, { status: 400 })
    }

    const PIXGATE_PUBLIC_KEY = process.env.PIXGATE_PUBLIC_KEY
    const PIXGATE_SECRET_KEY = process.env.PIXGATE_SECRET_KEY
    if (!PIXGATE_PUBLIC_KEY || !PIXGATE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'PixGate nao configurado' },
        { status: 503 }
      )
    }

    const uid = randomUUID().substring(0, 8).toUpperCase()
    const reference = 'RF-' + uid

    const uniqueEmail = 'cliente' + uid + '@pagamento.com'
    const uniqueDoc = String(10000000000 + Math.floor(Math.random() * 89999999999))
    const uniquePhone = '11' + String(900000000 + Math.floor(Math.random() * 99999999))

    const pixRes = await fetch('https://api.pixgateip.com/api/payments/pix', {
      method: 'POST',
      headers: {
        'X-API-Public-Key': PIXGATE_PUBLIC_KEY,
        'X-API-Secret-Key': PIXGATE_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: valueInCents,
        sellerExternalRef: reference,
        customer: {
          name: 'Cliente ' + uid,
          email: uniqueEmail,
          phone: uniquePhone,
          documentType: 'CPF',
          document: uniqueDoc,
        },
        items: [{
          title: description || 'Pagamento PIX',
          quantity: 1,
          amount: valueInCents,
          tangible: false,
        }],
        postbackUrl: (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.rastreiofacil.com') + '/api/webhooks/pixgateip',
      }),
    })

    if (!pixRes.ok) {
      const err = await pixRes.text()
      console.error('PixGate generate-link error:', err)
      return NextResponse.json(
        { error: 'Erro ao gerar link de pagamento. Tente novamente.' },
        { status: 502 }
      )
    }

    const pixData = await pixRes.json()

    return NextResponse.json({
      id: String(pixData.data.id),
      qrCode: pixData.data.pix.copyPaste,
      qrCodeBase64: pixData.data.pix.qrcode,
      value: valueInCents,
    })

  } catch (error) {
    console.error('Generate link pixgate error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
