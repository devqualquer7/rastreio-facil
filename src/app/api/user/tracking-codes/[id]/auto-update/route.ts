import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id } = await params
    const tc = query.getTrackingCodeById(id) as any
    if (!tc || tc.userId !== session.userId) {
      return NextResponse.json({ error: 'Rastreio não encontrado' }, { status: 404 })
    }

    const { templateId, action } = await request.json()

    if (action === 'deactivate') {
      query.deactivateAutoUpdate(id)
      return NextResponse.json({ success: true, message: 'Automação desativada' })
    }

    // Activate
    if (!templateId) {
      return NextResponse.json({ error: 'Template obrigatório' }, { status: 400 })
    }

    const template = query.getAutoTemplateById(templateId) as any
    if (!template || template.userId !== session.userId) {
      return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
    }

    query.activateAutoUpdate(id, templateId)
    return NextResponse.json({ success: true, message: 'Automação ativada' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
