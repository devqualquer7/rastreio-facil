import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    const token = process.env.PARADISE_API_KEY
    if (!token) {
      return NextResponse.json({ error: 'API Key não configurada' }, { status: 503 })
    }

    const statuses = await Promise.all(
      ids.map(async (id: string) => {
        try {
          const res = await fetch(
            `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${id}`,
            {
              headers: {
                'X-API-Key': token,
                'Accept': 'application/json',
              },
            }
          )

          if (res.ok) {
            const data = await res.json()
            console.log(`[ParadiseCheck] ID: ${id} | Response:`, JSON.stringify(data).substring(0, 500))

            const status = (data.status || '').toString().toLowerCase()
            const isPaid = ['approved', 'paid', 'completed'].includes(status)

            console.log(`[ParadiseCheck] ID: ${id} | status: ${status} | isPaid: ${isPaid}`)

            return { id, status: isPaid ? 'paid' : status || 'pending', paid: isPaid }
          } else {
            const errText = await res.text()
            console.error(`[ParadiseCheck] ID: ${id} | HTTP ${res.status} | Error: ${errText.substring(0, 200)}`)
            return { id, status: 'pending', paid: false }
          }
        } catch (err) {
          console.error(`[ParadiseCheck] ID: ${id} | Exception:`, err)
          return { id, status: 'error', paid: false }
        }
      })
    )

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Check paradise payment status error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
      }
