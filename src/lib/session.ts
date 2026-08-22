import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getKey(): Uint8Array {
  const secretKey = process.env.SESSION_SECRET
  if (!secretKey) throw new Error('SESSION_SECRET env var is required')
  return new TextEncoder().encode(secretKey)
}

export async function encrypt(payload: any, expiresIn = '24h') {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(getKey())
}

export async function decrypt(input: string): Promise<any> {
    try {
          const { payload } = await jwtVerify(input, getKey(), { algorithms: ['HS256'] })
          return payload
    } catch {
          return null
    }
}

export async function createSession(adminId: string) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ adminId, expires })
    const cookieStore = await cookies()
    cookieStore.set('session', session, {
          expires, httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', path: '/',
    })
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}

export async function getSession() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    if (!sessionCookie) return null
    return await decrypt(sessionCookie.value)
}

export async function createUserSession(userId: string) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, expires }, '7d')
    const cookieStore = await cookies()
    cookieStore.set('user-session', session, {
          expires, httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax', path: '/',
    })
}

export async function deleteUserSession() {
    const cookieStore = await cookies()
    cookieStore.delete('user-session')
}

export async function getUserSession() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('user-session')
    if (!sessionCookie) return null
    return await decrypt(sessionCookie.value)
}
