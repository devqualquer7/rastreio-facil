import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, canUseSlot } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

export async function GET() {
  try {
    const { username } = await requireSession()
    const admin = isEcAdmin(username)
    const [all, locked, lockNew, assigned] = await Promise.all([
      db.listCreds(), db.getLockedSlots(), db.getLockNew(), db.getAssignedSlots(),
    ])

    // Conta bloqueada aparece para todos (como "Bloqueado"), mas só o admin consegue usar.
    // Conta atribuída só aparece para o admin e para os usuários a quem foi atribuída.
    const visible = all.filter((c: any) => {
      const owners = assigned[Number(c.slot)]
      return admin || !owners?.length || owners.includes(username)
    })
    const canUse = (c: any) => canUseSlot(username, Number(c.slot), locked, assigned)

    // is_active vira PER-USUÁRIO: cada um vê a própria conta ativa destacada.
    // Mesma regra do db.getActiveCredForUser — escolha do usuário, senão a global.
    const userSlot = await db.getUserActiveSlot(username)
    const globalActive = all.find((c: any) => c.is_active)?.slot ?? null
    const usable = (slot: number | null) => slot != null && visible.some((c: any) => c.slot === slot && c.health_status !== 'banned' && canUse(c))
    const effective = usable(userSlot) ? userSlot : usable(globalActive) ? globalActive : null

    // Os tokens (mesmo criptografados) não têm por que ir para o navegador
    const out = visible.map(({ access_token, refresh_token, ...c }: any) => {
      const owners = assigned[Number(c.slot)] ?? []
      return {
        ...c,
        is_active: c.slot === effective,
        // Para quem recebeu a conta, ela não aparece como bloqueada
        locked: admin ? locked.includes(Number(c.slot)) : !canUse(c),
        assigned: owners.length > 0,
        // Só o admin precisa saber a lista de usuários
        ...(admin ? { assigned_to: owners } : {}),
      }
    })

    return NextResponse.json({ ok: true, creds: out, activeSlot: effective, ...(admin ? { lockNew } : {}) })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
