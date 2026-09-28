import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog, getSupabase } from '@/lib/ec-supabase'

// Maps web_logs DB columns to the API response shape the frontend expects
function mapLog(row: any) {
  // Actor: coluna dedicada `username` quando existir, senão extrai do "· por @x" da descrição.
  const inlineUser = typeof row.description === 'string'
    ? (row.description.match(/\s*·\s*por\s*@([\w.\-]+)\s*$/i)?.[1] ?? null)
    : null
  // Strip the "· por @username" suffix from the displayed message — it's shown separately as a badge.
  const rawDesc: string = row.description ?? ''
  const message = rawDesc.replace(/\s*·\s*por\s*@[\w.\-]+\s*$/i, '').trim()
  return {
    id:         row.id,
    level:      row.type,   // DB: type  → frontend: level
    message,                // DB: description without the inline "· por @x" actor suffix
    context:    row.slot_name ?? null,
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
    const { username } = await requireSession()
    const supabase = getSupabase()
    // Delete all log rows — Supabase requires at least one filter, use a always-true condition
    await supabase.from('web_logs').delete().gte('created_at', '2000-01-01T00:00:00Z')
    await addLog('error', 'Todos os logs foram apagados', 'admin', username)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
