import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const { id } = await params
    const payment = query.getPaymentById(id) as any
    if (!payment) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    if (payment.userId !== session.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    return NextResponse.json({ status: payment.status, paymentId: payment.id })
  } catch (error) {
    console.error('Payment status error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
