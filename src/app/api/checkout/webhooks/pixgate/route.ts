import { NextRequest, NextResponse } from 'next/server'
import { codb } from '@/lib/checkout-db'
import { db } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const externalId = body?.id ?? body?.transaction_id
    const status = (body?.status ?? '').toLowerCase()

    if (!externalId) return NextResponse.json({ ok: false, error: 'missing id' }, { status: 400 })

    if (status === 'paid' || status === 'completed' || status === 'approved') {
      codb.markTransactionPaidByExternalId(String(externalId))
      // Also mark EC saque payment as paid if this was a saque PIX
      try { await db.markSaquePaymentPaid(String(externalId)) } catch {}
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[webhook/pixgate]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
