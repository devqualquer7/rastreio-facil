import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET
const key = secretKey ? new TextEncoder().encode(secretKey) : null

async function verifyToken(token: string) {
  if (!key) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return payload
  } catch { return null }
}

// ── EC panel session (HMAC-SHA256, ec_session cookie) ──────────────────────
// Replicates ec-auth.ts logic using WebCrypto (Edge-compatible)
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function verifyEcSession(token?: string): Promise<{ username: string } | null> {
  if (!token || !secretKey) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [username, tsStr, sig] = parts
  if (!username || !tsStr || !sig) return null

  try {
    const enc = new TextEncoder()
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const data = enc.encode(`${username}.${tsStr}`)
    const sigBytes = hexToBytes(sig)
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes.buffer as ArrayBuffer, data)
    if (!valid) return null

    const age = Date.now() - Number(tsStr)
    if (age > 7 * 24 * 60 * 60 * 1000) return null
    return { username }
  } catch { return null }
}

// ── Checkout public API paths (old co-session checkout, if any remain) ──────
const CHECKOUT_PUBLIC_API = [
  '/api/checkout/auth/login',
  '/api/checkout/auth/register',
  '/api/checkout/webhooks/pushinpay',
  '/api/checkout/webhooks/paradise',
  '/api/checkout/webhooks/pixgate',
  '/api/checkout/webhooks/blackcat',
]

// ── EC panel: public endpoints that don't need ec_session ──────────────────
const EC_PUBLIC_API = [
  '/api/ec/auth/login',
  '/api/ec/auth/logout',
  '/api/ec/key',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (pathname === '/admin/login') {
    const cookie = request.cookies.get('session')
    if (cookie && await verifyToken(cookie.value)) return NextResponse.redirect(new URL('/admin', request.url))
    return response
  }

  if (pathname.startsWith('/admin')) {
    const cookie = request.cookies.get('session')
    if (!cookie) return NextResponse.redirect(new URL('/admin/login', request.url))
    const session = await verifyToken(cookie.value)
    if (!session) {
      const res = NextResponse.redirect(new URL('/admin/login', request.url))
      res.cookies.delete('session')
      return res
    }
    return response
  }

  // ── User ───────────────────────────────────────────────────────────────────
  if (pathname === '/login') {
    const cookie = request.cookies.get('user-session')
    if (cookie && await verifyToken(cookie.value)) return NextResponse.redirect(new URL('/dashboard', request.url))
    return response
  }

  if (pathname.startsWith('/dashboard')) {
    const cookie = request.cookies.get('user-session')
    if (!cookie) return NextResponse.redirect(new URL('/login', request.url))
    const session = await verifyToken(cookie.value)
    if (!session) {
      const res = NextResponse.redirect(new URL('/login', request.url))
      res.cookies.delete('user-session')
      return res
    }
    return response
  }

  if (pathname.startsWith('/api/admin')) {
    if (
      pathname === '/api/admin/generate-batch' ||
      pathname === '/api/admin/check-batch-status' ||
      pathname === '/api/admin/bridge-auth' ||
      pathname === '/api/admin/bridge-callback'
    ) return response

    const cookie = request.cookies.get('session')
    if (!cookie) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    const session = await verifyToken(cookie.value)
    if (!session) return NextResponse.json({ error: 'Sessao invalida' }, { status: 401 })
  }

  if (
    pathname.startsWith('/api/user') &&
    !pathname.startsWith('/api/user/login') &&
    !pathname.startsWith('/api/user/register')
  ) {
    const cookie = request.cookies.get('user-session')
    if (!cookie) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    const session = await verifyToken(cookie.value)
    if (!session) return NextResponse.json({ error: 'Sessao invalida' }, { status: 401 })
  }

  // ── Checkout (old co-session panel — kept for any existing routes) ─────────
  if (pathname.startsWith('/api/checkout')) {
    if (CHECKOUT_PUBLIC_API.includes(pathname)) return response
    const cookie = request.cookies.get('co-session')
    if (!cookie) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    const session = await verifyToken(cookie.value)
    if (!session) return NextResponse.json({ error: 'Sessao invalida' }, { status: 401 })
    return response
  }

  // ── EC panel pages (ec_session HMAC cookie) ────────────────────────────────
  if (pathname === '/checkout/login') {
    const cookie = request.cookies.get('ec_session')
    const session = await verifyEcSession(cookie?.value)
    if (session) return NextResponse.redirect(new URL('/checkout', request.url))
    return response
  }

  // Worker OAuth page — public, no session required
  if (pathname === '/checkout/oauth') return response

  if (pathname.startsWith('/checkout')) {
    const cookie = request.cookies.get('ec_session')
    const session = await verifyEcSession(cookie?.value)
    if (!session) {
      const res = NextResponse.redirect(new URL('/checkout/login', request.url))
      res.cookies.delete('ec_session')
      return res
    }
    return response
  }

  // ── EC panel API — public endpoints pass through; others self-auth ─────────
  if (pathname.startsWith('/api/ec')) {
    // Public endpoints: no session needed (routes handle their own logic)
    if (EC_PUBLIC_API.some(p => pathname === p || pathname.startsWith(p + '/'))) return response
    // OAuth endpoints are also public — workers use them without an ec_session
    if (pathname.startsWith('/api/ec/oauth/')) return response
    // Everything else: routes call requireSession() internally and return 401 on failure
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/api/user/:path*',
    '/login',
    '/checkout/:path*',
    '/api/checkout/:path*',
    '/api/ec/:path*',
  ],
}
