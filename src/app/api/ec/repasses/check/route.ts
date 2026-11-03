import { NextResponse } from 'next/server'
import { requireEcAdmin } from '@/lib/ec-auth'
import { checkToday, ledgerReady } from '@/lib/ec-ledger'

// GET /api/ec/repasses/check — confere as vendas de hoje no MP contra o saldo (só admin)
export async function GET() {
  try {
    await requireEcAdmin()
    if (!(await ledgerReady())) return NextResponse.json({ ok: false, error: 'Tabelas do painel não criadas' })
    return NextResponse.json({ ok: true, ...(await checkToday()) })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    if (e.message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Sem permissão' }, { status: 403 })
    console.error('[EC repasses/check]', e)
    return NextResponse.json({ ok: false, error: e?.message || 'Erro interno' }, { status: 500 })
  }
}
