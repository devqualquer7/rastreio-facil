import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const templates = query.getAutoTemplatesByUserId(session.userId as string)
    const result = (templates as any[]).map((t: any) => ({
      ...t,
      steps: query.getAutoTemplateSteps(t.id),
    }))
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error loading templates:', error)
    return NextResponse.json({ error: 'Erro ao carregar modelos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

    const template = query.createAutoTemplate({
      userId: session.userId as string,
      name: name.trim(),
    })
    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
