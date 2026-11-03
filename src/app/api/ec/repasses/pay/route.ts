import { NextRequest, NextResponse } from 'next/server'
import { requireEcAdmin } from '@/lib/ec-auth'
import { addLog, getSupabase } from '@/lib/ec-supabase'
import { pixFor } from '@/lib/ec-ledger'
import { getPushoverConfig, sendPushover } from '@/lib/ec-pushover'

const ERRORS: Record<string, string> = {
  sem_percentual: 'Defina a % deste usuário antes de pagar',
  sem_saldo: 'Este usuário não tem saldo a receber',
  saldo_mudou: 'O saldo mudou. Confira o novo valor e pague de novo',
}

const fmtMoney = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Avisa o usuário no Pushover dele. Sem Pushover configurado, só devolve false. */
async function notifyUser(username: string, title: string, message: string): Promise<boolean> {
  try {
    const cfg = await getPushoverConfig(username)
    if (!cfg.enabled || !cfg.userKey) return false
    return (await sendPushover(cfg.userKey, { title, message, sound: 'cashregister', priority: 0 })).ok
  } catch { return false }
}

// POST /api/ec/repasses/pay { username, maxId, amount } — botão PAGO
export async function POST(req: NextRequest) {
  try {
    const { username: admin } = await requireEcAdmin()
    const { username, maxId, amount } = await req.json()
    if (!username || !Number.isFinite(Number(maxId)) || !(Number(amount) > 0)) {
      return NextResponse.json({ ok: false, error: 'Dados inválidos' })
    }

    const pix = (await pixFor([username])).get(username)
    const { data, error } = await getSupabase().rpc('ec_pay_user', {
      p_username: username,
      p_max_id: Number(maxId),
      p_expected: Number(amount),
      p_pix_key: pix?.key ?? null,
      p_paid_by: admin,
    })
    if (error) {
      const code = Object.keys(ERRORS).find(k => error.message?.includes(k))
      if (!code) console.error('[EC repasses/pay]', error)
      return NextResponse.json({ ok: false, error: code ? ERRORS[code] : 'Erro ao registrar o pagamento' })
    }

    const value = fmtMoney(Number(data.amount))
    const notified = await notifyUser(username, '💸 Repasse pago', `${value} enviados para a sua chave Pix.`)
    await addLog('info', `Repasse pago · ${value} · para @${username}`, undefined, admin).catch(() => {})

    return NextResponse.json({ ok: true, payout: data, notified })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    if (e.message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Sem permissão' }, { status: 403 })
    console.error('[EC repasses/pay]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
