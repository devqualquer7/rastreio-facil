import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
import { createSession, createUserSession } from '@/lib/session'

// Rate limiting: max 5 attempts per IP in 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetAt - now) / 1000) }
  }
  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

function clearRateLimit(ip: string) { attempts.delete(ip) }

setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of attempts.entries()) {
    if (now > record.resetAt) attempts.delete(ip)
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const { allowed, retryAfter } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${retryAfter} segundos.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const username = String(body.username || '').trim()
    const password = String(body.password || '').trim()

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }
    if (username.length > 64 || password.length > 128) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const dummyHash = '$2b$12$invalidhashtopreventtimingattack000000000000000000000'

    // Try admin login first
    const admin = db.getAdminByUsername(username) as any
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password || dummyHash)
      if (valid) {
        clearRateLimit(ip)
        await createSession(admin.id)
        return NextResponse.json({ success: true })
      }
    }

    // Try regular user login
    const user = db.getUserByUsername(username) as any
    if (user) {
      // Check if user is active
      if (user.active === 0) {
        return NextResponse.json({ error: 'Conta desativada. Entre em contato com o suporte.' }, { status: 403 })
      }
      const valid = await bcrypt.compare(password, user.password || dummyHash)
      if (valid) {
        clearRateLimit(ip)
        await createUserSession(user.id)
        return NextResponse.json({ success: true })
      }
    }

    // Neither admin nor user matched
    // Run dummy compare to prevent timing attacks
    if (!admin && !user) {
      await bcrypt.compare(password, dummyHash)
    }

    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
