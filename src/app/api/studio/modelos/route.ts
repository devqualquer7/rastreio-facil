import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { randomUUID } from 'crypto'

// Increase body size limit for models that may contain large base64 data URIs
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

// GET /api/studio/modelos — list all cloud models
export async function GET() {
  try {
    await requireSession()
    const models = await db.listStudioModels()
    return NextResponse.json(models)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 })
    console.error('[Studio] GET /api/studio/modelos error:', e)
    return NextResponse.json({ erro: 'falha_ao_listar' }, { status: 500 })
  }
}

// POST /api/studio/modelos — save a new cloud model
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json()
    const { nome, dados, desc } = body || {}
    if (!nome || !dados || typeof dados !== 'object') {
      return NextResponse.json({ erro: 'dados_invalidos' }, { status: 400 })
    }
    const id = randomUUID()
    const model = {
      id,
      nome: String(nome).slice(0, 80),
      desc: String(desc || '').slice(0, 120),
      dados,
      criadoEm: Date.now(),
    }
    await db.saveStudioModel(id, model)
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 })
    console.error('[Studio] POST /api/studio/modelos error:', e)
    return NextResponse.json({ erro: 'falha_ao_salvar' }, { status: 500 })
  }
}
