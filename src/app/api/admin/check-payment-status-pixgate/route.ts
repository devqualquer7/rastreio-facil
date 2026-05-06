import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'

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

    const db = getDb()

    const statuses = ids.map((id: string) => {
      try {
        const row = db.prepare(
          'SELECT status FROM payments WHERE pixgate_id = ? OR gateway_id = ?'
        ).get(id, id) as { status?: string } | undefined

        if (row) {
          const status = (row.status || '').toLowerCase()
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
