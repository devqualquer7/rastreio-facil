import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })
    }

    const { ids, tokenType } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs sÃ£o obrigatÃ³rios' }, { status: 400 })
    }

    const token = tokenType === 'pj'
      ? process.env.PUSHINPAY_LINKS_PJ_TOKEN
      : process.env.PUSHINPAY_LINKS_TOKEN

    if (!token) {
      return NextResponse.json({ error: 'Token nÃ£o configurado' }, { status: 503 })
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
            console.log(`[CheckStatus] ID: ${id} | Response:`, JSON.stringify(data).substring(0, 500))

            // Check multiple possible status field locations
            const status = (
              data.status ||
              data.payment_status ||
              data.situation ||
              (data.data && data.data.status) ||
              (data.transaction && data.transaction.status) ||
              (data.pix && data.pix.status) ||
              ''
            ).toString().toLowerCase()

            // end_to_end_id presence means PIX was received
            const hasEndToEnd = !!(data.end_to_end_id || data.endToEndId || data.e2e_id)

            const isPaid = hasEndToEnd || ['paid', 'completed', 'approved', 'confirmed', 'received'].includes(status)

            console.log(`[CheckStatus] ID: ${id} | status: ${status} | hasEndToEnd: ${hasEndToEnd} | isPaid: ${isPaid}`)

            return { id, status: isPaid ? 'paid' : status || 'pending', paid: isPaid }
          } else {
            const errText = await res.text()
            console.error(`[CheckStatus] ID: ${id} | HTTP ${res.status} | Error: ${errText.substring(0, 200)}`)
            return { id, status: 'pending', paid: false }
          }
        } catch (err) {
          console.error(`[CheckStatus] ID: ${id} | Exception:`, err)
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
