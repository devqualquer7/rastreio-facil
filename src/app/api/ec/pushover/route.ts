import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { getPushoverConfig, savePushoverConfig } from '@/lib/ec-pushover'

// GET — config Pushover do usuário logado (individual)
export async function GET() {
  try {
    const { username } = await requireSession()
    const cfg = await getPushoverConfig(username)
    // Não devolve o apiToken inteiro em claro? Mantemos — é a conta do próprio usuário.
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
    const cfg = await savePushoverConfig(username, {
      enabled: body.enabled,
      userKey: body.userKey,
      apiToken: body.apiToken,
      events: body.events,
      sounds: body.sounds,
    })
    return NextResponse.json({ ok: true, config: cfg })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
