import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { getUtmifyConfig, sendUtmifyTest } from '@/lib/ec-utmify'

// POST — envia um Pedido de teste (isTest:true) pra UTMIFY.
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json().catch(() => ({}))
    let apiToken = (body.apiToken || '').trim()
    if (!apiToken) apiToken = (await getUtmifyConfig(username)).apiToken
    if (!apiToken) return NextResponse.json({ ok: false, error: 'Cole seu API Token da UTMIFY' })

    const r = await sendUtmifyTest(apiToken)
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error || 'Falha ao enviar', body: r.body })
    return NextResponse.json({ ok: true, body: r.body })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
