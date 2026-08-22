import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body.limit) || 200, 1000)
    const sales = await db.listSales(limit)
    return NextResponse.json({ ok: true, sales })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
