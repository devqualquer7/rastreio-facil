import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.is_banned === 'number') allowed.is_banned = body.is_banned
  if (typeof body.is_admin === 'number') allowed.is_admin = body.is_admin

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  codb.updateUser(id, allowed)
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { id } = await params

  // Cannot delete yourself
  if (id === session.coUserId) {
    return NextResponse.json({ error: 'Você não pode deletar sua própria conta' }, { status: 400 })
  }

  codb.deleteUser(id)
  return NextResponse.json({ success: true })
}
