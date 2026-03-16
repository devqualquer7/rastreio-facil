import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'
import { createSession } from '@/lib/session'

// Rate limiting: máx 5 tentativas por IP em 15 minutos
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos

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

function clearRateLimit(ip: string) {
  attempts.delete(ip)
}

// Limpa entradas expiradas periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of attempts.entries()) {
    if (now > record.resetAt) attempts.delete(ip)
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const { allowed, remaining, retryAfter } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_ATTEMPTS),
          'X-RateLimit-Remaining': '0',
        },
      }
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

    const admin = db.getAdminByUsername(username) as any
    const dummyHash = '$2b$12$invalidhashtopreventtimingattack000000000000000000000'
    const hashToCompare = admin?.password || dummyHash
    const valid = await bcrypt.compare(password, hashToCompare)

    if (!admin || !valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    clearRateLimit(ip)
    await createSession(admin.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
