import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'


const secretKey = process.env.SESSION_SECRET
if (!secretKey) throw new Error('SESSION_SECRET env var is required')
const key = new TextEncoder().encode(secretKey)


async function verifyToken(token: string) {
    try {
          const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
          return payload
    } catch { return null }
}


export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const response = NextResponse.next()


  response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')


  if (pathname === '/admin/login') {
        const cookie = request.cookies.get('session')
        if (cookie && await verifyToken(cookie.value)) return NextResponse.redirect(new URL('/admin', request.url))
        return response
  }


  if (pathname.startsWith('/admin')) {
        const cookie = request.cookies.get('session')
        if (!cookie) return NextResponse.redirect(new URL('/admin/login', request.url))
        const session = await verifyToken(cookie.value)
        if (!session) { const res = NextResponse.redirect(new URL('/admin/login', request.url)); res.cookies.delete('session'); return res }
        return response
  }


  if (pathname === '/login') {
        const cookie = request.cookies.get('user-session')
        if (cookie && await verifyToken(cookie.value)) return NextResponse.redirect(new URL('/dashboard', request.url))
        return response
  }


  if (pathname.startsWith('/dashboard')) {
        const cookie = request.cookies.get('user-session')
        if (!cookie) return NextResponse.redirect(new URL('/login', request.url))
        const session = await verifyToken(cookie.value)
        if (!session) { const res = NextResponse.redirect(new URL('/login', request.url)); res.cookies.delete('user-session'); return res }
        return response
  }


  if (pathname.startsWith('/api/admin')) {
        // Bypass session check for endpoints that have their own auth:
      //  - generate-batch, check-batch-status: Bearer token (BATCH_API_TOKEN)
      //  - bridge-auth: signed by desktop with BRIDGE_HMAC_SECRET (or admin session for mobile)
      //  - bridge-callback: signed by desktop with BRIDGE_HMAC_SECRET
      // NOTE: /api/admin/mobile/* still uses the admin session cookie (it's user-facing)
      if (
              pathname === '/api/admin/generate-batch' ||
              pathname === '/api/admin/check-batch-status' ||
              pathname === '/api/admin/bridge-auth' ||
              pathname === '/api/admin/bridge-callback'
            ) {
              return response
      }
        const cookie = request.cookies.get('session')
        if (!cookie) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        const session = await verifyToken(cookie.value)
        if (!session) return NextResponse.json({ error: 'Sessao invalida' }, { status: 401 })
  }


  if (pathname.startsWith('/api/user') && !pathname.startsWith('/api/user/login') && !pathname.startsWith('/api/user/register')) {
        const cookie = request.cookies.get('user-session')
        if (!cookie) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
        const session = await verifyToken(cookie.value)
        if (!session) return NextResponse.json({ error: 'Sessao invalida' }, { status: 401 })
  }


  return response
}


export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*', '/dashboard/:path*', '/api/user/:path*', '/login'],
}
