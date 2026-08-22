import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

// POST /api/ec/saque/status
// Body: { externalIds: string[] }
// Returns: { ok: true, statuses: { [externalId]: 'pending' | 'paid' } }
export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const { externalIds } = await req.json()

    if (!Array.isArray(externalIds) || externalIds.length === 0) {
      return NextResponse.json({ ok: true, statuses: {} })
    }

    const statuses = await db.getSaqueStatuses(externalIds.slice(0, 100))
    return NextResponse.json({ ok: true, statuses })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: e.message || 'Erro' }, { status: 500 })
  }
}
