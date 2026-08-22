import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import { decryptCredentials } from '@/lib/checkout-crypto'
import { gatewayCreatePix, isValidGateway } from '@/lib/checkout-gateways'

export async function POST(req: NextRequest) {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { gateway, amount, description } = await req.json()

    if (!isValidGateway(gateway)) {
      return NextResponse.json({ error: 'Gateway inválida' }, { status: 400 })
    }

    const amountCents = Math.round(Number(amount) * 100)
    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'Valor mínimo é R$ 1,00' }, { status: 400 })
    }

    const gwRow = codb.getGateway(session.coUserId, gateway)
    if (!gwRow) {
      return NextResponse.json({ error: `Gateway ${gateway} não configurada` }, { status: 400 })
    }

    const creds = decryptCredentials(gwRow.credentials)
    if (!creds) {
      return NextResponse.json({ error: 'Credenciais inválidas. Configure a gateway novamente.' }, { status: 500 })
    }

    const result = await gatewayCreatePix(gateway, creds, amountCents, description)

    const tx = codb.createTransaction({
      user_id: session.coUserId,
      gateway,
      external_id: result.external_id,
      amount: amountCents,
      description: description ?? null,
      pix_code: result.pix_code,
      pix_base64: result.pix_base64 ?? undefined,
    })

    return NextResponse.json({
      id: tx.id,
      externalId: result.external_id,
      pixCode: result.pix_code,
      pixBase64: result.pix_base64,
      amount: amountCents,
      gateway,
      status: 'pending',
    })
  } catch (e: any) {
    console.error('[checkout/pix POST]', e)
    return NextResponse.json({ error: e?.message ?? 'Erro ao gerar PIX' }, { status: 502 })
  }
}
