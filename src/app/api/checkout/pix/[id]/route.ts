import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import { decryptCredentials } from '@/lib/checkout-crypto'
import { checkTransactionStatus, isValidGateway } from '@/lib/checkout-gateways'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const tx = codb.getTransactionById(id)
  if (!tx || tx.user_id !== session.coUserId) {
    return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
  }

  // If still pending, try to check status via gateway API (BlackCat only; others are webhook-driven)
  if (tx.status === 'pending' && tx.external_id && isValidGateway(tx.gateway)) {
    const gwRow = codb.getGateway(session.coUserId, tx.gateway)
    if (gwRow) {
      const creds = decryptCredentials(gwRow.credentials)
      if (creds) {
        const remoteStatus = await checkTransactionStatus(tx.gateway, creds, tx.external_id)
        if (remoteStatus === 'paid' || remoteStatus === 'approved' || remoteStatus === 'completed') {
          codb.markTransactionPaid(tx.id)
          tx.status = 'paid'
        }
      }
    }
  }

  return NextResponse.json({
    id: tx.id,
    gateway: tx.gateway,
    externalId: tx.external_id,
    amount: tx.amount,
    description: tx.description,
    pixCode: tx.pix_code,
    pixBase64: tx.pix_base64,
    status: tx.status,
    paidAt: tx.paid_at,
    createdAt: tx.created_at,
  })
}
