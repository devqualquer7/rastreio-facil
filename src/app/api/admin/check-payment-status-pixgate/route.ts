import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

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

    const publicKey = process.env.PIXGATE_PUBLIC_KEY
    const secretKey = process.env.PIXGATE_SECRET_KEY
    if (!publicKey || !secretKey) {
      return NextResponse.json({ error: 'PixGate nao configurado' }, { status: 503 })
    }

    const statuses = await Promise.all(
      ids.map(async (id: string) => {
        try {
          const res = await fetch(
            `https://api.pixgateip.com/api/payments/transactions/${id}`,
            {
              headers: {
                'X-API-Public-Key': publicKey,
                'X-API-Secret-Key': secretKey,
                'Accept': 'application/json',
              },
            }
          )
          if (res.ok) {
            const data = await res.json()
            console.log(`[PixGateCheck] ID: ${id} | Response:`, JSON.stringify(data).substring(0, 500))
            const status = (data.data?.status || '').toString().toLowerCase()
            const isPaid = ['paid', 'approved', 'completed'].includes(status)
            console.log(`[PixGateCheck] ID: ${id} | status: ${status} | isPaid: ${isPaid}`)
            return { id, status: isPaid ? 'paid' : status || 'pending', paid: isPaid }
          } else {
            const errText = await res.text()
            console.error(`[PixGateCheck] ID: ${id} | HTTP ${res.status} | Error: ${errText.substring(0, 200)}`)
            return { id, status: 'pending', paid: false }
          }
        } catch (err) {
          console.error(`[PixGateCheck] ID: ${id} | Exception:`, err)
          return { id, status: 'error', paid: false }
        }
      })
    )

    return NextResponse.json({ statuses })

  } catch (error) {
    console.error('Check pixgate payment status error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
