import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { getPushoverConfig, sendPushover } from '@/lib/ec-pushover'

// POST — dispara notificação de teste. Token é global do app; só precisa do User Key.
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json().catch(() => ({}))

    let userKey = (body.userKey || '').trim()
    let sound = body.sound || 'cashregister'
    if (!userKey) {
      const cfg = await getPushoverConfig(username)
      userKey = cfg.userKey
      sound = sound || cfg.sounds.approved
    }
    if (!userKey) return NextResponse.json({ ok: false, error: 'Preencha seu User Key' })

    const r = await sendPushover(userKey, {
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
