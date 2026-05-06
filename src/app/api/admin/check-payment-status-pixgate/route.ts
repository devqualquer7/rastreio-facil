import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs sao obrigatorios' }, { status: 400 })
    }

    const statuses = ids.map((id: string) => {
      try {
        const normalizedId = String(id).trim()
        let payment = query.getPaymentByPixgateId(normalizedId)
        if (!payment) {
          payment = query.getPaymentByPushinpayId(normalizedId)
        }

        if (payment) {
          const status = (payment.status || '').toLowerCase()
          const isPaid = ['paid', 'approved', 'completed'].includes(status)
          return { id, status: isPaid ? 'paid' : status || 'pending', paid: isPaid }
        }

        return { id, status: 'pending', paid: false }
      } catch {
        return { id, status: 'pending', paid: false }
      }
    })

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Check pixgate payment status error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
