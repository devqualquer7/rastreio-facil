import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'
import db from '@/lib/db'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params

  const event = (db as any).prepare('SELECT te.*, tc.userId FROM TrackingEvent te JOIN TrackingCode tc ON te.trackingCodeId = tc.id WHERE te.id = ?').get(id) as any
  if (!event || event.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  query.deleteTrackingEvent(id)
  return NextResponse.json({ success: true })
}
