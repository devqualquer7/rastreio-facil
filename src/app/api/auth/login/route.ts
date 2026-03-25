import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import db, { query } from '@/lib/db'
import { createSession, createUserSession } from '@/lib/session'

// Rate limiting: mÃ¡x 5 tentativas por IP em 15 minutos
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
      return NextResponse.json({ error: 'UsuÃ¡rio e senha sÃ£o obrigatÃ³rios' }, { status: 400 })
    }

    // SanitizaÃ§Ã£o bÃ¡sica (evita injeÃ§Ã£o)
    if (username.length > 64 || password.length > 128) {
      return NextResponse.json({ error: 'Credenciais invÃ¡lidas' }, { status: 401 })
    }

    // Sempre compara (tempo constante), mesmo que usuÃ¡rio nÃ£o exista
    const dummyHash = '$2b$12$invalidhashtopreventtimingattack000000000000000000000'

    // 1) Tenta Admin
    const admin = db.prepare('SELECT * FROM Admin WHERE username = ?').get(username) as any
    if (admin) {
      const valid = await bcrypt.compare(password, admin.password || dummyHash)
      if (valid) {
        clearRateLimit(ip)
        await createSession(admin.id)
        return NextResponse.json({ success: true })
      }
    }

    // 2) Tenta User
    const user = query.getUserByUsername(username) as any
    if (user) {
      const valid = await bcrypt.compare(password, user.password || dummyHash)
      if (valid) {
        // Verifica se estÃ¡ ativo
        if (!user.active) {
          return NextResponse.json(
            { error: 'Conta desativada. Contate o administrador.' },
            { status: 403 }
          )
        }
        clearRateLimit(ip)
        await createUserSession(user.id)
        return NextResponse.json({ success: true })
      }
    }

    // Se nÃ£o encontrou ou senha errada (resposta genÃ©rica para evitar enumeraÃ§Ã£o)
    // Faz bcrypt.compare com dummy para manter tempo constante se nenhum foi encontrado
    if (!admin && !user) {
      await bcrypt.compare(password, dummyHash)
    }

    return NextResponse.json(
      { error: 'Credenciais invÃ¡lidas' },
      {
        status: 401,
        headers: {
          'X-RateLimit-Limit': String(MAX_ATTEMPTS),
          'X-RateLimit-Remaining': String(remaining - 1),
        },
      }
    )
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
