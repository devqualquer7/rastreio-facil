import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from 'A/lib/session'
import { query } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const tc = query.getTrackingCodeById(id)
  if (!tc || tc.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(tc)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const tc = query.getTrackingCodeById(id)
  if (!tc || tc.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const { description } = await request.json()
  query.updateTrackingCode(id, { description })
  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const tc = query.getTrackingCodeById(id)
  if (!tc || tc.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  query.deleteTrackingCode(id)
  return NextResponse.json({ success: true })
}
