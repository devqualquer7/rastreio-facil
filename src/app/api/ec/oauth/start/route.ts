import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'node:crypto'
import { db } from '@/lib/ec-supabase'

const SECRET = process.env.SESSION_SECRET || 'change-me-in-prod-please-super-secret-key-32chars'

function signState(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

// Public — no ec_session required (workers use this)
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name?.trim()) return NextResponse.json({ ok: false, error: 'Nome obrigatório' })

    // Load OAuth credentials from settings
    const rows = await db.getSettings(['mp_oauth_client_id', 'mp_oauth_redirect_url'])
    const clientId = rows.find(r => r.key === 'mp_oauth_client_id')?.value
    const redirectUrl = rows.find(r => r.key === 'mp_oauth_redirect_url')?.value
      || `${req.nextUrl.origin}/api/ec/oauth/callback`

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'OAuth não configurado — contate o administrador' })
    }

    // Build signed state: base64url(JSON) + "." + hmac
    const payload = JSON.stringify({ name: name.trim(), ts: Date.now() })
    const b64 = Buffer.from(payload).toString('base64url')
    const sig = signState(b64)
    const state = `${b64}.${sig}`

    const authUrl = new URL('https://auth.mercadopago.com/authorization')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('platform_id', 'mp')
    authUrl.searchParams.set('redirect_uri', redirectUrl)
    authUrl.searchParams.set('state', state)

    return NextResponse.json({ ok: true, url: authUrl.toString() })
  } catch (e: any) {
    console.error('[ec/oauth/start]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
