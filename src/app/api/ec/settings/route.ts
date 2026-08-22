import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

const SETTING_KEYS = [
  'default_title', 'auto_cancel_enabled', 'max_rejections_per_link', 'cancel_after_minutes',
  'mp_oauth_client_id', 'mp_oauth_client_secret', 'mp_oauth_redirect_url',
]

export async function GET() {
  try {
    await requireSession()
    const rows = await db.getSettings(SETTING_KEYS)

    const settings: Record<string, any> = {
      default_title: 'Pagamento',
      auto_cancel_enabled: false,
      max_rejections_per_link: 3,
      cancel_after_minutes: 60,
      mp_oauth_client_id: '',
      mp_oauth_client_secret: '',
      mp_oauth_redirect_url: '',
    }

    for (const row of rows) {
      if (row.key === 'auto_cancel_enabled') settings[row.key] = row.value === 'true'
      else if (['max_rejections_per_link', 'cancel_after_minutes'].includes(row.key)) settings[row.key] = Number(row.value)
      else settings[row.key] = row.value
    }

    return NextResponse.json({ ok: true, settings })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json()

    const updates: Array<{ key: string; value: string }> = []
    if (body.default_title !== undefined) updates.push({ key: 'default_title', value: String(body.default_title) })
    if (body.auto_cancel_enabled !== undefined) updates.push({ key: 'auto_cancel_enabled', value: String(body.auto_cancel_enabled) })
    if (body.max_rejections_per_link !== undefined) updates.push({ key: 'max_rejections_per_link', value: String(body.max_rejections_per_link) })
    if (body.cancel_after_minutes !== undefined) updates.push({ key: 'cancel_after_minutes', value: String(body.cancel_after_minutes) })
    if (body.mp_oauth_client_id !== undefined) updates.push({ key: 'mp_oauth_client_id', value: String(body.mp_oauth_client_id) })
    if (body.mp_oauth_client_secret !== undefined) updates.push({ key: 'mp_oauth_client_secret', value: String(body.mp_oauth_client_secret) })
    if (body.mp_oauth_redirect_url !== undefined) updates.push({ key: 'mp_oauth_redirect_url', value: String(body.mp_oauth_redirect_url) })

    for (const { key, value } of updates) {
      await db.setSetting(key, value)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
