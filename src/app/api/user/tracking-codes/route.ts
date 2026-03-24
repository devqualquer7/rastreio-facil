import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const codes = query.getTrackingCodesByUserId(session.userId as string)
    return NextResponse.json(codes)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const user = query.getUserById(session.userId as string) as any
    if (!user) return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })

    // Check plan expiry
    if (user.planExpiry && new Date(user.planExpiry) < new Date()) {
      return NextResponse.json({ error: 'Sua assinatura expirou. Renove para continuar.' }, { status: 403 })
    }

    // Check tracking limit using maxTrackingCodes
    const existingCodes = query.getTrackingCodesByUserId(session.userId as string) as any[]
    const limit = user.maxTrackingCodes || 5
    if (existingCodes.length >= limit) {
      return NextResponse.json({ error: 'Limite de rastreios atingido. Faça upgrade do plano.' }, { status: 403 })
    }

    const { code, description, clientId, deliveryDate } = await request.json()

    if (!code || !String(code).trim()) {
      return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })
    }

    const trimCode = String(code).trim().toUpperCase()

    // Check duplicate
    const existing = query.getTrackingCodeByCode(trimCode) as any
    if (existing) {
      return NextResponse.json({ error: 'Este código já existe no sistema' }, { status: 409 })
    }

    // Validate client if provided
    if (clientId) {
      const client = query.getClientById(clientId) as any
      if (!client || client.userId !== session.userId) {
        return NextResponse.json({ error: 'Cliente inválido' }, { status: 400 })
      }
    }

    // Create tracking code
    const tc = query.createTrackingCode({
      code: trimCode,
      description: description || null,
      clientId: clientId || null,
      userId: session.userId as string,
    })

    // Create initial event if delivery date
    if (deliveryDate) {
      query.createTrackingEvent({
        trackingCodeId: (tc as any).id,
        status: 'Objeto postado',
        location: null,
        date: new Date(deliveryDate).toISOString(),
      })
    }

    return NextResponse.json(tc, { status: 201 })
  } catch (error) {
    console.error('Error creating tracking code:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
