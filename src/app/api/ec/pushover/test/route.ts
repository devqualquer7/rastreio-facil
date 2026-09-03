import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { getPushoverConfig, sendPushoverRaw } from '@/lib/ec-pushover'

// POST — dispara uma notificação de teste. Usa as creds do corpo (ainda não salvas)
// ou, se ausentes, as já salvas do usuário.
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json().catch(() => ({}))

    let userKey = (body.userKey || '').trim()
    let apiToken = (body.apiToken || '').trim()
    let sound = body.sound || 'cashregister'
    if (!userKey || !apiToken) {
      const cfg = await getPushoverConfig(username)
      userKey = userKey || cfg.userKey
      apiToken = apiToken || cfg.apiToken
      sound = sound || cfg.sounds.approved
    }
    if (!userKey || !apiToken) {
      return NextResponse.json({ ok: false, error: 'Preencha User Key e API Token' })
    }

    const r = await sendPushoverRaw(userKey, apiToken, {
      title: '✅ Teste — EncryptedSoftware',
      message: `Notificações funcionando, @${username}! Você vai receber aqui quando suas vendas forem pagas.`,
      sound,
      priority: 1,
    })
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error || 'Falha ao enviar' })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
