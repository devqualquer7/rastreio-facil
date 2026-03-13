import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'rastreio-facil-change-in-production'
const key = new TextEncoder().encode(secretKey)

async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Adiciona security headers em todas as respostas
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Página de login: redireciona se já autenticado
  if (pathname === '/admin/login') {
    const sessionCookie = request.cookies.get('session')
    if (sessionCookie) {
      const session = await verifySession(sessionCookie.value)
      if (session) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    return response
  }

  // Rotas admin: exige autenticação
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const session = await verifySession(sessionCookie.value)
    if (!session) {
      const res = NextResponse.redirect(new URL('/admin/login', request.url))
      res.cookies.delete('session')
      return res
    }
  }

  // Bloqueia acesso direto às APIs de admin sem sessão válida
  if (pathname.startsWith('/api/clients') ||
      pathname.startsWith('/api/tracking-codes') ||
      pathname.startsWith('/api/tracking-events')) {
    const sessionCookie = request.cookies.get('session')
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const session = await verifySession(sessionCookie.value)
    if (!session) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/clients/:path*',
    '/api/tracking-codes/:path*',
    '/api/tracking-events/:path*',
  ],
}
