import * as crypto from 'node:crypto'
import { cookies } from 'next/headers'

const SECRET = process.env.SESSION_SECRET || 'change-me-in-prod-please-super-secret-key-32chars'
export const COOKIE = 'ec_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 dias

function sign(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex')
}

export function createSession(username: string): string {
  const payload = `${username}.${Date.now()}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export function verifySession(token?: string): { username: string } | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [username, tsStr, sig] = parts
  const expected = sign(`${username}.${tsStr}`)
  if (sig !== expected) return null
  const age = Date.now() - Number(tsStr)
  if (age > MAX_AGE * 1000) return null
  return { username }
}

export async function getSession(): Promise<{ username: string } | null> {
  const c = (await cookies()).get(COOKIE)
  return verifySession(c?.value)
}

export async function requireSession(): Promise<{ username: string }> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: MAX_AGE, path: '/'
  })
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE)
}
