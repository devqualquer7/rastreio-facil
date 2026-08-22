import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET
if (!secretKey) throw new Error('SESSION_SECRET env var is required')
const key = new TextEncoder().encode(secretKey)

const COOKIE = 'co-session'
const EXPIRES_MS = 7 * 24 * 60 * 60 * 1000

async function sign(payload: Record<string, unknown>, expiresIn = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

async function verify(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export async function createCheckoutSession(userId: string, isAdmin: boolean) {
  const expires = new Date(Date.now() + EXPIRES_MS)
  const token = await sign({ coUserId: userId, isAdmin, expires: expires.toISOString() })
  const store = await cookies()
  store.set(COOKIE, token, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteCheckoutSession() {
  const store = await cookies()
  store.delete(COOKIE)
}

export async function getCheckoutSession(): Promise<{ coUserId: string; isAdmin: boolean } | null> {
  const store = await cookies()
  const c = store.get(COOKIE)
  if (!c) return null
  const p = await verify(c.value)
  if (!p || !p.coUserId) return null
  return { coUserId: p.coUserId as string, isAdmin: Boolean(p.isAdmin) }
}

export async function verifyCheckoutToken(token: string) {
  return verify(token)
}
