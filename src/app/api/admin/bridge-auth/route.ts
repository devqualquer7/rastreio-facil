/**
 * Pusher Channel Authorization
 *
 * Pusher requires server-side auth for private/presence channels. The desktop
 * (and the server itself, when broadcasting) needs this endpoint to be allowed
 * to subscribe.
 *
 * Two callers:
 *
 * 1. DESKTOP — sends X-Bridge-Auth header signed with BRIDGE_HMAC_SECRET.
 *    Desktop has the secret stored locally (configured by user via env var
 *    "BRIDGE_HMAC_SECRET" mirrored on both sides — actually, the desktop
 *    derives it from a key configured in the Modo Mobile UI).
 *
 *    For first-time setup, we accept any X-Bridge-Auth that signs against
 *    the shared secret. There's no per-bridge pairing — single user, single PC.
 *
 * 2. MOBILE — middleware already validates the admin session cookie before
 *    we get here (because path is /api/admin/*). We just authorize.
 */

import { NextRequest, NextResponse } from 'next/server'
import Pusher from 'pusher'

function getPusher(): Pusher | null {
  const appId   = process.env.PUSHER_APP_ID
  const key     = process.env.PUSHER_KEY
  const secret  = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER || 'sa1'
  if (!appId || !key || !secret) return null
  return new Pusher({ appId, key, secret, cluster, useTLS: true })
}

export async function POST(request: NextRequest) {
  try {
    const pusher = getPusher()
    if (!pusher) {
      return NextResponse.json(
        { error: 'PUSHER_* env vars não configuradas.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const socketId    = formData.get('socket_id')?.toString() || ''
    const channelName = formData.get('channel_name')?.toString() || ''

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Parâmetros faltando.' }, { status: 400 })
    }

    // Channel must follow our naming pattern
    if (!/^presence-bridge-[a-f0-9]+$/.test(channelName)) {
      return NextResponse.json({ error: 'Canal inválido.' }, { status: 403 })
    }

    // ── DESKTOP path ─────────────────────────────
    // Desktop sends BRIDGE_HMAC_SECRET directly in X-Bridge-Auth header.
    // HTTPS protects in transit; secret stays only in PC + Render env.
    const desktopAuth = request.headers.get('x-bridge-auth') || ''
    if (desktopAuth) {
      const expected = process.env.BRIDGE_HMAC_SECRET || ''
      if (!expected) {
        return NextResponse.json(
          { error: 'BRIDGE_HMAC_SECRET não configurado.' },
          { status: 503 }
        )
      }
      if (desktopAuth.length !== expected.length) {
        return NextResponse.json({ error: 'Auth inválido.' }, { status: 401 })
      }
      let diff = 0
      for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ desktopAuth.charCodeAt(i)
      }
      if (diff !== 0) {
        return NextResponse.json({ error: 'Auth inválido.' }, { status: 401 })
      }
      const presenceData = {
        user_id: 'desktop',
        user_info: { role: 'desktop' },
      }
      const auth = pusher.authorizeChannel(socketId, channelName, presenceData)
      return NextResponse.json(auth)
    }

    // ── MOBILE path ─────────────────────────────
    // Middleware already validated the admin session for /api/admin/*
    // (the /api/admin/bridge-auth path is NOT in the bypass list)
    const presenceData = {
      user_id: 'mobile-' + Math.random().toString(36).slice(2, 10),
      user_info: { role: 'mobile' },
    }
    const auth = pusher.authorizeChannel(socketId, channelName, presenceData)
    return NextResponse.json(auth)

  } catch (error: any) {
    console.error('[bridge-auth]', error)
    return NextResponse.json(
      { error: 'Erro: ' + (error?.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
