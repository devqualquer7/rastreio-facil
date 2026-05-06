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

    const numValue = Number(String(value).replace(',', '.'))
    if (!numValue || numValue < 1) {
      return NextResponse.json({ error: 'Valor minimo e R$ 1,00' }, { status: 400 })
    }

    const PIXGATE_API_KEY = process.env.PIXGATE_API_KEY
    if (!PIXGATE_API_KEY) {
      return NextResponse.json(
        { error: 'PixGate nao configurado' },
        { status: 503 }
      )
    }

    const uid = randomUUID().substring(0, 8).toUpperCase()
    const uniqueDoc = String(10000000000 + Math.floor(Math.random() * 89999999999))

    const pixRes = await fetch('https://app.pixgateip.com/api/v1/cashin', {
      method: 'POST',
      headers: {
        'Apikey': PIXGATE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: 'Cliente ' + uid,
        cpf: uniqueDoc,
        valor: numValue.toFixed(2),
        descricao: description || 'Pagamento PIX',
        postback: (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.rastreiofacil.com') + '/api/webhooks/pixgateip',
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
    console.log('[PixGate] Cashin response:', JSON.stringify(pixData).substring(0, 500))

    return NextResponse.json({
      id: String(pixData.id),
      qrCode: pixData.pix,
      qrCodeBase64: '',
      value: Math.round(numValue * 100),
    })

  } catch (error) {
    console.error('Generate link pixgate error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
