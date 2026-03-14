import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  const session = await getUserSession()
  if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const codes = query.getTrackingCodesByUserId(session.userId as string)
  return NextResponse.json(codes)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const user = query.getUserById(session.userId as string)
    if (!user || !user.active) return NextResponse.json({ error: 'Conta inativa' }, { status: 403 })

    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Sua assinatura expirou. Renove para continuar.' }, { status: 403 })
    }

    if (user.trackingUsed >= user.trackingLimit) {
      return NextResponse.json({ error: `Limite de ${user.trackingLimit} rastreios atingido. Adquira um pacote extra.` }, { status: 403 })
    }

    const { code, description } = await request.json()
    if (!code) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

    const existing = query.getTrackingCodeByCode(code.trim().toUpperCase())
    if (existing) return NextResponse.json({ error: 'Este código já existe no sistema' }, { status: 409 })

    const tc = query.createTrackingCode({
      code: code.trim().toUpperCase(),
      userId: session.userId as string,
      description: description || null,
    })

    query.incrementTrackingUsed(session.userId as string)

    return NextResponse.json(tc, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
