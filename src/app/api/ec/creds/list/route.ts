import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

export async function GET() {
  try {
    const { username } = await requireSession()
    const admin = isEcAdmin(username)
    const [all, locked, lockNew] = await Promise.all([db.listCreds(), db.getLockedSlots(), db.getLockNew()])

    // Conta bloqueada aparece para todos (como "Bloqueado"), mas só o admin consegue usar.
    const visible = all
    const canUse = (c: any) => admin || !locked.includes(Number(c.slot))

    // is_active vira PER-USUÁRIO: cada um vê a própria conta ativa destacada.
    // Mesma regra do db.getActiveCredForUser — escolha do usuário, senão a global.
    const userSlot = await db.getUserActiveSlot(username)
    const globalActive = all.find((c: any) => c.is_active)?.slot ?? null
    const usable = (slot: number | null) => slot != null && visible.some((c: any) => c.slot === slot && c.health_status !== 'banned' && canUse(c))
    const effective = usable(userSlot) ? userSlot : usable(globalActive) ? globalActive : null

    // Os tokens (mesmo criptografados) não têm por que ir para o navegador
    const out = visible.map(({ access_token, refresh_token, ...c }: any) => ({
      ...c,
      is_active: c.slot === effective,
      locked: locked.includes(Number(c.slot)),
    }))

    return NextResponse.json({ ok: true, creds: out, activeSlot: effective, ...(admin ? { lockNew } : {}) })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
