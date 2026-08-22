import { NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'

export async function GET() {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const withdrawals = codb.getWithdrawalsByUser(session.coUserId, 200)
  return NextResponse.json(withdrawals)
}
