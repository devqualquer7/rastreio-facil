import { NextRequest, NextResponse } from 'next/server'
import { requireEcAdmin } from '@/lib/ec-auth'
import { addLog, getSupabase } from '@/lib/ec-supabase'
import { getPushoverConfig, sendPushover } from '@/lib/ec-pushover'

// POST /api/ec/repasses/undo { payoutId } — desfaz um PAGO marcado por engano
export async function POST(req: NextRequest) {
  try {
    const { username: admin } = await requireEcAdmin()
    const { payoutId } = await req.json()
    if (!Number.isFinite(Number(payoutId))) return NextResponse.json({ ok: false, error: 'Dados inválidos' })

    const { data, error } = await getSupabase().rpc('ec_undo_payout', { p_id: Number(payoutId) })
    if (error) return NextResponse.json({ ok: false, error: 'Este pagamento já foi desfeito' })

    const value = Number(data.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    await addLog('info', `Repasse desfeito · ${value} · de @${data.username}`, undefined, admin).catch(() => {})

    // O usuário já recebeu o aviso de pago: precisa saber que foi corrigido.
    const cfg = await getPushoverConfig(data.username).catch(() => null)
    if (cfg?.enabled && cfg.userKey) {
      await sendPushover(cfg.userKey, {
        title: 'Repasse corrigido',
        message: `O pagamento de ${value} foi marcado por engano e voltou para o seu saldo.`,
      }).catch(() => {})
    }

    const own = await getPushoverConfig(admin).catch(() => null)
    if (own?.enabled && own.userKey) {
      await sendPushover(own.userKey, {
        title: `↩️ Pagamento de @${data.username} desfeito`,
        message: `${value} voltou para o saldo de @${data.username}.`,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    if (e.message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Sem permissão' }, { status: 403 })
    console.error('[EC repasses/undo]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
