import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from 'A/lib/session'
import { query } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const payment = query.getPaymentById(id)
  if (!payment || payment.userId !== session.userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ status: payment.status, type: payment.type })
}
