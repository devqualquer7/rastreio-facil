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

    // Use Brazil timezone (UTC-3) for date calculations
    const BRT_OFFSET = -3
    const nowUtc = new Date()
    const nowBrt = new Date(nowUtc.getTime() + BRT_OFFSET * 60 * 60 * 1000)
    const eventsCreated: any[] = []

    for (const step of steps) {
      // Calculate the target date in BRT
      const targetBrt = new Date(nowBrt)
      targetBrt.setDate(targetBrt.getDate() + (step.dayOffset || 0))

      // Get year, month, day in BRT
      const year = targetBrt.getUTCFullYear()
      const month = String(targetBrt.getUTCMonth() + 1).padStart(2, '0')
      const day = String(targetBrt.getUTCDate()).padStart(2, '0')

      // Use the exact time from the template step (already in BRT)
      const time = step.time || '09:00'
      const [hours, minutes] = time.split(':')

      // Build the date string directly in BRT then convert to UTC ISO for storage
      // The template times are in BRT, so we subtract the offset to get UTC
      const dateStr = year + '-' + month + '-' + day + 'T' + hours.padStart(2, '0') + ':' + minutes.padStart(2, '0') + ':00.000-03:00'

      // Create the tracking event with the correct timezone-aware date
      const eventDate = new Date(dateStr)

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
      message: 'Automacao ativada com ' + eventsCreated.length + ' eventos criados',
      eventsCreated: eventsCreated.length
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
