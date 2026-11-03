import { NextRequest, NextResponse } from 'next/server'
import { requireEcAdmin } from '@/lib/ec-auth'
import { isEcAdmin } from '@/lib/ec-admin'
import { db, getSupabase } from '@/lib/ec-supabase'
import { lastDayCheck, ledgerReady, loadEntries, percentsFor, pixFor, syncLedgerBriefly } from '@/lib/ec-ledger'
import { periodRange, r2, summarize } from '@/lib/ec-ledger-calc'

// GET /api/ec/repasses?period=today|week|month|year|custom&from=&to= — saldos e resumo (só admin)
export async function GET(req: NextRequest) {
  try {
    await requireEcAdmin()
    if (!(await ledgerReady())) return NextResponse.json({ ok: true, needsSetup: true })
    await syncLedgerBriefly()

    const q = req.nextUrl.searchParams
    const range = periodRange(q.get('period') || 'today', q.get('from'), q.get('to'))

    const [entries, open, listed, payoutsRes] = await Promise.all([
      loadEntries({ fromISO: range.fromISO, toISO: range.toISO }),
      loadEntries({ openOnly: true }),
      db.listUsers(),
      getSupabase().from('web_payouts').select('*').is('undone_at', null)
        .order('created_at', { ascending: false }).limit(300),
    ])

    const names = [...new Set([...listed.map((u: any) => u.username), ...open.map(e => e.username)])]
      .filter(u => !isEcAdmin(u))
    const [percents, pix] = await Promise.all([percentsFor(names), pixFor(names)])

    const users = names.map(username => {
      const mine = open.filter(e => e.username === username)
      return {
        username,
        percent: percents.get(username) ?? null,
        pix: pix.get(username) ?? null,
        balance: r2(mine.reduce((s, e) => s + Number(e.user_share), 0)),
        gross: r2(mine.reduce((s, e) => s + Number(e.gross), 0)),
        sales: mine.filter(e => e.kind === 'sale').length,
        refunds: mine.filter(e => e.kind === 'reversal').length,
        missingPercent: mine.filter(e => e.percent == null).length,
        maxId: mine.reduce((m, e) => Math.max(m, Number(e.id)), 0),
      }
    }).sort((a, b) => b.balance - a.balance)

    return NextResponse.json({
      ok: true,
      users,
      summary: summarize(entries, range),
      groupBy: range.groupBy,
      payouts: payoutsRes.data ?? [],
      check: lastDayCheck(),
    })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    if (e.message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Sem permissão' }, { status: 403 })
    console.error('[EC repasses]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
