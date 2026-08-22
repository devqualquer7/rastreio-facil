import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  codb.deleteKey(id)
  return NextResponse.json({ success: true })
}
