import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { clientId, deliveryDate } = body

    // Update clientId on tracking code
    query.updateTrackingCode(id, { clientId: clientId || null })

    // Handle delivery date event: remove old, add new
    const tc = query.getTrackingCodeById(id)
    if (!tc) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

    const previsaoEvents = (tc.events as any[]).filter((e: any) =>
      e.status.toLowerCase().startsWith('previs')
    )
    for (const ev of previsaoEvents) {
      query.deleteTrackingEvent(ev.id)
    }

    if (deliveryDate) {
      const dateFormatted = new Date(deliveryDate).toLocaleDateString('pt-BR')
      query.createTrackingEvent({
        trackingCodeId: id,
        status: `Previsão de entrega: ${dateFormatted}`,
        date: new Date(deliveryDate).toISOString()
      })
    }

    return NextResponse.json(query.getTrackingCodeById(id))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    query.deleteTrackingCode(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar.' }, { status: 500 })
  }
}
