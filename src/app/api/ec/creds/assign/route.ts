import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, addLog } from '@/lib/ec-supabase'
import { isEcAdmin } from '@/lib/ec-admin'

/**
 * Atribuição de contas — só o admin.
 *   { slot, usernames: [...] } → só esses usuários (e o admin) veem e usam a conta
 *   { slot, usernames: [] }    → volta a ser global
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await requireSession()
    if (!isEcAdmin(username)) return NextResponse.json({ ok: false, error: 'Apenas o administrador' }, { status: 403 })

    const body = await req.json()
    const slot = Number(body.slot)
    if (!slot || !Array.isArray(body.usernames)) {
      return NextResponse.json({ ok: false, error: 'slot e usernames obrigatórios' }, { status: 400 })
    }
    const cred = await db.getCredBySlot(slot)
    if (!cred) return NextResponse.json({ ok: false, error: 'Slot não encontrado' }, { status: 404 })

    // Só aceita usuários que existem (e ignora o próprio admin, que já vê tudo)
    const existing = new Set((await db.listUsers()).map((u: any) => u.username))
    const usernames = [...new Set<string>(body.usernames.map((u: any) => String(u).trim()))]
      .filter(u => existing.has(u) && !isEcAdmin(u))

    await db.setSlotAssigned(slot, usernames)
    await addLog(
      'status',
      usernames.length
        ? `Conta atribuída a ${usernames.join(', ')}: slot #${slot} "${cred.name ?? ''}"`
        : `Conta voltou a ser global: slot #${slot} "${cred.name ?? ''}"`,
      `slot #${slot}`, username,
    ).catch(() => {})

    return NextResponse.json({ ok: true, slot, assigned_to: usernames })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro interno' })
  }
}
