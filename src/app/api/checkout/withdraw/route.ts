import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import { decryptCredentials } from '@/lib/checkout-crypto'
import { gatewayWithdraw, isValidGateway } from '@/lib/checkout-gateways'

const VALID_PIX_TYPES = ['cpf', 'cnpj', 'email', 'phone', 'random']

export async function POST(req: NextRequest) {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { gateway, amount, pix_key, pix_key_type } = await req.json()

    if (!isValidGateway(gateway)) {
      return NextResponse.json({ error: 'Gateway inválida' }, { status: 400 })
    }

    const amountCents = Math.round(Number(amount) * 100)
    if (!amountCents || amountCents < 100) {
      return NextResponse.json({ error: 'Valor mínimo é R$ 1,00' }, { status: 400 })
    }

    if (!pix_key || !pix_key_type) {
      return NextResponse.json({ error: 'Chave PIX e tipo são obrigatórios' }, { status: 400 })
    }

    if (!VALID_PIX_TYPES.includes(pix_key_type)) {
      return NextResponse.json({ error: 'Tipo de chave PIX inválido' }, { status: 400 })
    }

    const gwRow = codb.getGateway(session.coUserId, gateway)
    if (!gwRow) {
      return NextResponse.json({ error: `Gateway ${gateway} não configurada` }, { status: 400 })
    }

    const creds = decryptCredentials(gwRow.credentials)
    if (!creds) {
      return NextResponse.json({ error: 'Credenciais inválidas. Configure a gateway novamente.' }, { status: 500 })
    }

    const result = await gatewayWithdraw(gateway, creds, amountCents, pix_key, pix_key_type)

    const withdrawal = codb.createWithdrawal({
      user_id: session.coUserId,
      gateway,
      amount: amountCents,
      pix_key,
      pix_key_type,
      external_id: result.external_id ?? undefined,
      status: result.status,
      response: JSON.stringify(result.raw),
    })

    return NextResponse.json({ success: true, id: withdrawal.id, status: result.status })
  } catch (e: any) {
    console.error('[checkout/withdraw POST]', e)
    return NextResponse.json({ error: e?.message ?? 'Erro ao processar saque' }, { status: 502 })
  }
}
