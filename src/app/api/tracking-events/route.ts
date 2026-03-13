import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { trackingCodeId, status, location, date } = await request.json()
    if (!trackingCodeId || !status) {
      return NextResponse.json({ error: 'Obrigatórios.' }, { status: 400 })
    }
    const event = query.createTrackingEvent({ trackingCodeId, status, location: location || null, date: date || undefined })
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro.' }, { status: 500 })
  }
}
