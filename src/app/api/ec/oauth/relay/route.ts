/**
 * OAuth Relay — called by encryptedgroup.com after MP redirects there.
 *
 * encryptedgroup.com POSTs here with {code, state, redirect_uri, name}.
 * We exchange the code, save the credential, then return the access_token
 * so encryptedgroup.com can also post it to Supabase for the desktop exe.
 *
 * Public — no ec_session required.
 * CORS allowed from encryptedgroup.com.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'node:crypto'
import { db, addLog } from '@/lib/ec-supabase'
import { encrypt } from '@/lib/ec-crypto'

const SECRET = process.env.SESSION_SECRET || 'change-me-in-prod-please-super-secret-key-32chars'

const ALLOWED_ORIGINS = [
  'https://encryptedgroup.com',
  'https://www.encryptedgroup.com',
]

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function verifyState(state: string): { name: string; ts: number } | null {
  const dot = state.lastIndexOf('.')
  if (dot < 0) return null
  const b64 = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto.createHmac('sha256', SECRET).update(b64).digest('hex')
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString())
    // State expires after 30 minutes
    if (Date.now() - payload.ts > 30 * 60 * 1000) return null
    return payload
  } catch { return null }
}

// Preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  const err = (msg: string, status = 400) =>
    NextResponse.json({ ok: false, error: msg }, { status, headers })

  try {
    const body = await req.json()
    const { code, state, redirect_uri, name: rawName } = body

    if (!code) return err('code obrigatório')
    if (!state && !rawName) return err('state ou name obrigatório')

    // Try to get name from state (preferred — signed by us)
    let credName = rawName?.trim() || ''
    if (state) {
      const stateData = verifyState(state)
      if (stateData) credName = stateData.name.trim() || credName
      // If state is invalid but we have a rawName, proceed with rawName
    }

    if (!credName) return err('Nome da conta não identificado')

    // Load settings: client_id, client_secret
    const rows = await db.getSettings(['mp_oauth_client_id', 'mp_oauth_client_secret', 'mp_oauth_redirect_url'])
    const clientId = rows.find(r => r.key === 'mp_oauth_client_id')?.value
    const clientSecret = rows.find(r => r.key === 'mp_oauth_client_secret')?.value

    if (!clientId || !clientSecret) return err('OAuth não configurado no servidor')

    // Use provided redirect_uri (must match what was used to start the flow)
    // encryptedgroup.com sends 'https://encryptedgroup.com/oauth/'
    const redirectUri = redirect_uri || 'https://encryptedgroup.com/oauth/'

    // Exchange code → access_token
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[ec/oauth/relay] token exchange failed', tokenData)
      return err(`Falha ao obter token: ${tokenData?.message || tokenData?.error || 'erro MP'}`, 502)
    }

    const accessToken: string = tokenData.access_token
    const mpUserId = String(tokenData.user_id || '')

    // Save to web_credentials
    const existing = await db.getCredByMpUserId(mpUserId)
    const encToken = await encrypt(accessToken)
    const slot = existing?.slot ?? await db.nextSlot()

    await db.upsertCred({
      slot,
      name: credName,
      mp_user_id: mpUserId,
      access_token: encToken,
      connected: true,
      health_status: 'ok',
    })

    // Auto-activate if no active cred
    const active = await db.getActiveCred()
    if (!active) {
      await db.setAllInactive()
      await db.updateCred(slot, { is_active: true })
    }

    await addLog(
      'link',
      `OAuth relay: slot #${slot} "${credName}" · MP user ${mpUserId}`,
      `slot #${slot}`
    ).catch(() => {})

    // Return access_token so encryptedgroup.com can also store it for the exe
    return NextResponse.json(
      { ok: true, access_token: accessToken, slot, name: credName, mp_user_id: mpUserId },
      { headers }
    )
  } catch (e: any) {
    console.error('[ec/oauth/relay]', e)
    return err(`Erro interno: ${e.message}`, 500)
  }
}
