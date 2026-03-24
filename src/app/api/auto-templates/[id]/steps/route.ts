import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const template = query.getAutoTemplateById(params.id) as any
    if (!template || template.userId !== session.userId) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    const { dayOffset, time, status, location } = await request.json()
    if (dayOffset === undefined || dayOffset === null) return NextResponse.json({ error: 'Dia obrigatório' }, { status: 400 })
    if (!time?.trim()) return NextResponse.json({ error: 'Horário obrigatório' }, { status: 400 })
    if (!status?.trim()) return NextResponse.json({ error: 'Status obrigatório' }, { status: 400 })

    const sortOrder = dayOffset * 10000 + parseInt(time.replace(':', ''))

    const step = query.createAutoTemplateStep({
      templateId: params.id,
      dayOffset: parseInt(dayOffset),
      time: time.trim(),
      status: status.trim(),
      location: location?.trim() || null,
      sortOrder,
    })
    return NextResponse.json(step, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
