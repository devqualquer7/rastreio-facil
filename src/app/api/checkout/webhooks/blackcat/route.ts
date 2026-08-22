import { NextRequest, NextResponse } from 'next/server'
import { codb } from '@/lib/checkout-db'

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get('x-webhook-event') ?? ''
    const body = await req.json()
    const externalId = body?.id ?? body?.transaction_id

    if (!externalId) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })

    if (event === 'transaction.paid' || event === 'transaction.completed') {
      codb.markTransactionPaidByExternalId(String(externalId))
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook/blackcat]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
