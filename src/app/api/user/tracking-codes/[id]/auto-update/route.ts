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

    // Save activation
    query.activateAutoUpdate(id, templateId)

    // Get template steps and create tracking events immediately
    const steps = query.getAutoTemplateSteps(templateId) as any[]
    const now = new Date()
    const eventsCreated: any[] = []

    for (const step of steps) {
      // Calculate event date: activation date + dayOffset days, at the specified time
      const eventDate = new Date(now)
      eventDate.setDate(eventDate.getDate() + (step.dayOffset || 0))

      // Parse time (HH:MM format)
      if (step.time) {
        const [hours, minutes] = step.time.split(':').map(Number)
        eventDate.setHours(hours, minutes, 0, 0)
      }

      // Create the tracking event
      const event = query.createTrackingEvent({
        trackingCodeId: id,
        status: step.status,
        location: step.location || null,
        date: eventDate.toISOString()
      })
      eventsCreated.push(event)
    }

    return NextResponse.json({
      success: true,
      message: `Automacao ativada com ${eventsCreated.length} eventos criados`,
      eventsCreated: eventsCreated.length
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
