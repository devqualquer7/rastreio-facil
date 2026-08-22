import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'node:crypto'
import { db, addLog } from '@/lib/ec-supabase'
import { encrypt } from '@/lib/ec-crypto'

const SECRET = process.env.SESSION_SECRET || 'change-me-in-prod-please-super-secret-key-32chars'

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

// Public — no ec_session required
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const errorPage = (msg: string) =>
    NextResponse.redirect(`${origin}/checkout/oauth?error=${encodeURIComponent(msg)}`)

  if (errorParam) return errorPage('Autorização negada no Mercado Pago')
  if (!code || !state) return errorPage('Parâmetros inválidos')

  const stateData = verifyState(state)
  if (!stateData) return errorPage('Estado inválido ou expirado — tente novamente')

  try {
    const rows = await db.getSettings(['mp_oauth_client_id', 'mp_oauth_client_secret', 'mp_oauth_redirect_url'])
    const clientId = rows.find(r => r.key === 'mp_oauth_client_id')?.value
    const clientSecret = rows.find(r => r.key === 'mp_oauth_client_secret')?.value
    const redirectUrl = rows.find(r => r.key === 'mp_oauth_redirect_url')?.value
      || `${origin}/api/ec/oauth/callback`

    if (!clientId || !clientSecret) return errorPage('OAuth não configurado')

    // Exchange code for token
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUrl,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[ec/oauth/callback] token exchange failed', tokenData)
      return errorPage('Falha ao obter token do Mercado Pago')
    }

    const accessToken: string = tokenData.access_token
    const mpUserId = String(tokenData.user_id || '')

    // Check if slot already exists for this mp_user_id
    const existing = await db.getCredByMpUserId(mpUserId)
    const encToken = await encrypt(accessToken)
    const slot = existing?.slot ?? await db.nextSlot()
    const credName = stateData.name.trim()

    await db.upsertCred({
      slot,
      name: credName,
      mp_user_id: mpUserId,
      access_token: encToken,
      connected: true,
      health_status: 'ok',
    })

    // Activate if no active cred
    const active = await db.getActiveCred()
    if (!active) {
      await db.setAllInactive()
      await db.updateCred(slot, { is_active: true })
    }

    await addLog(
      'link',
      `OAuth conectado: slot #${slot} "${credName}" · MP user ${mpUserId}`,
      `slot #${slot}`
    ).catch(() => {})

    return NextResponse.redirect(`${origin}/checkout/oauth?success=1&name=${encodeURIComponent(credName)}`)
  } catch (e: any) {
    console.error('[ec/oauth/callback]', e)
    return errorPage('Erro interno ao salvar credencial')
  }
}
