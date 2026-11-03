import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, getSupabase } from '@/lib/ec-supabase'
import { ledgerReady, loadEntries, percentsFor, pixFor, pixKey, syncLedgerBriefly } from '@/lib/ec-ledger'
import { periodRange, r2, summarize } from '@/lib/ec-ledger-calc'

// GET /api/ec/me/ganhos — só os dados do próprio usuário, nunca os de outro
export async function GET() {
  try {
    const { username } = await requireSession()
    const pix = (await pixFor([username])).get(username) ?? null
    if (!(await ledgerReady())) return NextResponse.json({ ok: true, needsSetup: true, pix })
    await syncLedgerBriefly()

    const sb = getSupabase()
    const [open, recentRes, payoutsRes, percents] = await Promise.all([
      loadEntries({ username, openOnly: true }),
      sb.from('web_ledger')
        .select('id,kind,title,gross,user_share,percent,settled,payout_id,occurred_at,slot_name')
        .eq('username', username).order('occurred_at', { ascending: false }).limit(100),
      sb.from('web_payouts').select('id,amount,entries_count,pix_key,created_at')
        .eq('username', username).is('undone_at', null).order('created_at', { ascending: false }).limit(100),
      percentsFor([username]),
    ])

    // Hoje, semana e mês sem buscar o histórico inteiro.
    const periods = { today: periodRange('today'), week: periodRange('week'), month: periodRange('month') }
    const fromISO = periods.week.fromISO < periods.month.fromISO ? periods.week.fromISO : periods.month.fromISO
    const entries = await loadEntries({ username, fromISO })
    const pick = (range: typeof periods.today) => {
      const s = summarize(entries.filter(e => {
        const t = Date.parse(e.occurred_at)
        return t >= Date.parse(range.fromISO) && t <= Date.parse(range.toISO)
      }), range)
      return { gross: s.gross, sales: s.sales, refunds: s.refunds, share: s.userShare }
    }

    const payouts = payoutsRes.data ?? []
    return NextResponse.json({
      ok: true,
      percent: percents.get(username) ?? null,
      pix,
      balance: r2(open.reduce((sum, e) => sum + Number(e.user_share), 0)),
      pendingSales: open.filter(e => e.kind === 'sale').length,
      paidTotal: r2(payouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0)),
      today: pick(periods.today),
      week: pick(periods.week),
      month: pick(periods.month),
      entries: recentRes.data ?? [],
      payouts,
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC me/ganhos]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/ec/me/ganhos { pixKey } — o próprio usuário cadastra a chave
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    const body = await req.json()
    const key = String(body.pixKey || '').trim()
    if (key.length < 5 || key.length > 140) return NextResponse.json({ ok: false, error: 'Chave Pix inválida' })

    const current = (await pixFor([username])).get(username)
    if (current?.key === key) return NextResponse.json({ ok: true })

    await db.setSetting(pixKey(username), JSON.stringify({
      key,
      updatedAt: new Date().toISOString(),
      // Troca de chave fica em alerta para o admin até ele confirmar.
      changed: !!current,
    }))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    console.error('[EC me/ganhos]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
