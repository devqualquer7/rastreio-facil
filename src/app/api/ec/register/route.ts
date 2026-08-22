import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, addLog } from '@/lib/ec-supabase'

const KEY_PREFIX = 'regkey:'

// POST /api/ec/register — PUBLIC: self-registration with a valid invite key
export async function POST(req: NextRequest) {
  try {
    const { key, username, password } = await req.json()

    if (!key?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json({ ok: false, error: 'Chave, username e senha são obrigatórios' })
    }
    if (username.trim().length < 3) return NextResponse.json({ ok: false, error: 'Username muito curto (mín. 3 caracteres)' })
    if (password.trim().length < 6) return NextResponse.json({ ok: false, error: 'Senha muito curta (mín. 6 caracteres)' })
    if (!/^[a-z0-9_.\-]+$/i.test(username.trim())) {
      return NextResponse.json({ ok: false, error: 'Username inválido — use letras, números, _ ou -' })
    }

    // Validate key
    const rawMeta = await db.getSetting(`${KEY_PREFIX}${key.trim()}`)
    if (!rawMeta) return NextResponse.json({ ok: false, error: 'Chave inválida ou expirada' })

    let meta: any = {}
    try { meta = JSON.parse(rawMeta) } catch {}
    if (meta.used || meta.revoked) {
      return NextResponse.json({ ok: false, error: 'Chave já utilizada ou revogada' })
    }

    // Check username availability
    const existing = await db.getUserByUsername(username.trim())
    if (existing) return NextResponse.json({ ok: false, error: 'Username já está em uso' })

    // Create user
    const hash = await bcrypt.hash(password.trim(), 12)
    await db.createUser(username.trim(), hash, '')

    // Mark key as used
    await db.setSetting(`${KEY_PREFIX}${key.trim()}`, JSON.stringify({
      ...meta,
      used: true,
      used_by: username.trim(),
      used_at: new Date().toISOString(),
    }))

    await addLog('login', `Auto-cadastro: usuário "${username.trim()}" criado via chave ${key.trim().slice(0, 8)}…`)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[EC register]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
