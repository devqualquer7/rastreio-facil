import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

    const { id } = await params
    const tc = query.getTrackingCodeById(id) as any
    if (!tc || tc.userId !== session.userId) {
      return NextResponse.json({ error: 'Rastreio nao encontrado' }, { status: 404 })
    }

    const { templateId, action } = await request.json()

    if (action === 'deactivate') {
      query.deactivateAutoUpdate(id)
      return NextResponse.json({ success: true, message: 'Automacao desativada' })
    }

    // Activate
    if (!templateId) {
      return NextResponse.json({ error: 'Template obrigatorio' }, { status: 400 })
    }

    const template = query.getAutoTemplateById(templateId) as any
    if (!template || template.userId !== session.userId) {
      return NextResponse.json({ error: 'Template nao encontrado' }, { status: 404 })
    }

    // Save activation with current timestamp (ISO string)
    const now = new Date().toISOString()
    query.activateAutoUpdate(id, templateId, now)

    return NextResponse.json({
      success: true,
      message: 'Automacao ativada. Os eventos serao criados nos horarios programados.'
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
