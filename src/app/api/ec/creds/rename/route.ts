import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { slot, name } = await req.json()
    if (!slot || !name?.trim()) return NextResponse.json({ ok: false, error: 'slot e name obrigatórios' })

    await db.updateCred(slot, { name: name.trim() })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
