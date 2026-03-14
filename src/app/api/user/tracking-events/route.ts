import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { trackingCodeId, status, location, date } = await request.json()
  if (!trackingCodeId || !status) return NextResponse.json({ error: 'trackingCodeId e status obrigatórios' }, { status: 400 })

  const tc = query.getTrackingCodeById(trackingCodeId)
  if (!tc || tc.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const event = query.createTrackingEvent({ trackingCodeId, status, location, date })
  return NextResponse.json(event, { status: 201 })
}
