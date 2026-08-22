import { NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'

export async function GET() {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const users = codb.getAllUsers()
  return NextResponse.json(users)
}
