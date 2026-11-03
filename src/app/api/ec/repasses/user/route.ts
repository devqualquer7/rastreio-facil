import { NextRequest, NextResponse } from 'next/server'
import { requireEcAdmin } from '@/lib/ec-auth'
import { isEcAdmin } from '@/lib/ec-admin'
import { db, getSupabase } from '@/lib/ec-supabase'
import { percentKey, pixFor, pixKey } from '@/lib/ec-ledger'

// POST /api/ec/repasses/user { username, percent } ou { username, confirmPix: true }
export async function POST(req: NextRequest) {
  try {
    await requireEcAdmin()
    const { username, percent, confirmPix } = await req.json()
    if (!username || isEcAdmin(username)) return NextResponse.json({ ok: false, error: 'Usuário inválido' })

    if (confirmPix) {
      const pix = (await pixFor([username])).get(username)
      if (pix) await db.setSetting(pixKey(username), JSON.stringify({ ...pix, changed: false }))
      return NextResponse.json({ ok: true })
    }

    const value = Number(percent)
    if (percent === '' || percent == null || !Number.isFinite(value) || value < 0 || value > 100) {
      return NextResponse.json({ ok: false, error: 'A % precisa estar entre 0 e 100' })
    }

    // Vale para as próximas vendas e para as que ainda estavam sem %.
    await db.setSetting(percentKey(username), String(value))
    const { error } = await getSupabase().rpc('ec_fill_percent', { p_username: username, p_percent: value })
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    if (e.message === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'Sem permissão' }, { status: 403 })
    console.error('[EC repasses/user]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
