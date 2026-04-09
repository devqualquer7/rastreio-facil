import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { ids, tokenType } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    const token = tokenType === 'pj'
      ? process.env.PUSHINPAY_LINKS_PJ_TOKEN
      : process.env.PUSHINPAY_LINKS_TOKEN

    if (!token) {
      return NextResponse.json({ error: 'Token não configurado' }, { status: 503 })
    }

    const statuses = await Promise.all(
      ids.map(async (id: string) => {
        try {
          const res = await fetch(`https://api.pushinpay.com.br/api/pix/cashIn/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          })
          if (res.ok) {
            const data = await res.json()
            return {
              id,
              status: data.status || 'pending',
              paid: ['paid', 'completed', 'approved'].includes((data.status || '').toLowerCase())
            }
          }
          return { id, status: 'pending', paid: false }
        } catch {
          return { id, status: 'error', paid: false }
        }
      })
    )

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Check payment status error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
