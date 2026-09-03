import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, getSupabase } from '@/lib/ec-supabase'

// Maps web_logs DB columns to the API response shape the frontend expects
function mapLog(row: any) {
  // Actor: coluna dedicada `username` quando existir, senão extrai do "· por @x" da descrição.
  const inlineUser = typeof row.description === 'string'
    ? (row.description.match(/·\s*por\s*@([\w.\-]+)\s*$/i)?.[1] ?? null)
    : null
  return {
    id:         row.id,
    level:      row.type,        // DB: type  → frontend: level
    message:    row.description, // DB: description → frontend: message
    context:    row.slot_name ?? row.reference ?? null,
    slot:       row.slot ?? null,
    amount:     row.amount ?? null,
    username:   row.username ?? inlineUser,
    created_at: row.created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireSession()
    const { searchParams } = new URL(req.url)
    const tab    = searchParams.get('tab') ?? 'todos'   // todos | links | estornos | status | logins
    const limit  = Math.min(Number(searchParams.get('limit') ?? 300), 1000)

    const sb = getSupabase()
    let query = sb.from('web_logs').select('*').order('created_at', { ascending: false }).limit(limit)

    if (tab === 'links')    query = query.eq('type', 'link')
    else if (tab === 'estornos') query = query.eq('type', 'refund')
    else if (tab === 'status')  query = query.in('type', ['status', 'approved', 'rejected'])
    else if (tab === 'logins')  query = query.eq('type', 'login')
    // 'todos' → no filter

    const { data } = await query
    const logs = (data ?? []).map(mapLog)
    return NextResponse.json({ ok: true, logs })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

export async function DELETE() {
  try {
    await requireSession()
    const supabase = getSupabase()
    await supabase.from('web_logs').delete().neq('id', 0)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
