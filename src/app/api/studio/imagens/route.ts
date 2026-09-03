import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { randomUUID } from 'crypto'

// GET /api/studio/imagens — list all library images
export async function GET() {
  try {
    await requireSession()
    const images = await db.listStudioImages()
    return NextResponse.json(images)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 })
    console.error('[Studio] GET /api/studio/imagens error:', e)
    return NextResponse.json({ erro: 'falha_ao_listar' }, { status: 500 })
  }
}

// POST /api/studio/imagens — add an image (URL or base64 data URI)
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json()
    const { nome, src } = body || {}
    if (!src || typeof src !== 'string') {
      return NextResponse.json({ erro: 'sem_imagem' }, { status: 400 })
    }
    const id = randomUUID()
    const img = {
      id,
      nome: String(nome || 'imagem').slice(0, 60),
      src: src.slice(0, 6 * 1024 * 1024), // 6 MB safety cap (matches fosterstudio)
      criadoEm: Date.now(),
    }
    await db.saveStudioImage(id, img)
    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 })
    console.error('[Studio] POST /api/studio/imagens error:', e)
    return NextResponse.json({ erro: 'falha_ao_salvar' }, { status: 500 })
  }
}
