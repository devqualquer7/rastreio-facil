import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { getUtmifyConfig, saveUtmifyConfig } from '@/lib/ec-utmify'

// GET — config UTMIFY do usuário logado (individual)
export async function GET() {
  try {
    const { username } = await requireSession()
    const cfg = await getUtmifyConfig(username)
    return NextResponse.json({ ok: true, config: cfg })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// POST — salva a config do usuário logado
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json().catch(() => ({}))
    const cfg = await saveUtmifyConfig(username, { enabled: body.enabled, apiToken: body.apiToken })
    return NextResponse.json({ ok: true, config: cfg })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
