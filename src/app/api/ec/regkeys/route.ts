import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog, getSupabase } from '@/lib/ec-supabase'
import { randomUUID } from 'crypto'

const KEY_PREFIX = 'regkey:'

// GET /api/ec/regkeys — list all registration keys
export async function GET() {
  try {
    await requireSession()

    // Fetch all regkey settings
    const sb = getSupabase()
    const { data } = await sb
      .from('web_settings')
      .select('key,value,updated_at')
      .like('key', `${KEY_PREFIX}%`)
      .order('updated_at', { ascending: false })

    const keys = (data ?? []).map(row => {
      const token = row.key.replace(KEY_PREFIX, '')
      let meta: any = {}
      try { meta = JSON.parse(row.value) } catch {}
      return { token, ...meta, key: row.key, updated_at: row.updated_at }
    })

    return NextResponse.json({ ok: true, keys })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// POST /api/ec/regkeys — generate a new registration key
export async function POST() {
  try {
    const { username: me } = await requireSession()

    const token = randomUUID().replace(/-/g, '')
    const meta = { created_by: me, created_at: new Date().toISOString(), used: false }
    await db.setSetting(`${KEY_PREFIX}${token}`, JSON.stringify(meta))
    await addLog('login', `Admin "${me}" gerou chave de registro: ${token.slice(0, 8)}…`)

    return NextResponse.json({ ok: true, token })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

// DELETE /api/ec/regkeys — revoke a key
export async function DELETE(req: NextRequest) {
  try {
    const { username: me } = await requireSession()
    const { token } = await req.json()
    if (!token) return NextResponse.json({ ok: false, error: 'Token obrigatório' })

    // Clear the setting to revoke
    await db.setSetting(`${KEY_PREFIX}${token}`, JSON.stringify({ revoked: true, revoked_by: me }))
    await addLog('login', `Admin "${me}" revogou chave de registro: ${String(token).slice(0, 8)}…`)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
