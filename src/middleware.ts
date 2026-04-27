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
