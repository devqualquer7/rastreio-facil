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

    const keys = (data ?? []).map((row: any) => {
      const token = row.key.replace(KEY_PREFIX, '')
      let meta: any = {}
      try { meta = JSON.parse(row.value) } catch {}

      // Normalize legacy data: created_by/revoked_by may be stored as object {username:"..."}
      if (meta.created_by && typeof meta.created_by === 'object') {
        meta.created_by = meta.created_by.username ?? String(meta.created_by)
      }
      if (meta.revoked_by && typeof meta.revoked_by === 'object') {
        meta.revoked_by = meta.revoked_by.username ?? String(meta.revoked_by)
      }
      if (meta.used_by && typeof meta.used_by === 'object') {
        meta.used_by = meta.used_by.username ?? String(meta.used_by)
      }

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
