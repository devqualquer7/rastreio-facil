import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'
import { getSupabase } from '@/lib/ec-supabase'

export async function GET() {
  try {
    await requireSession()
    const logs = await db.listLogs(200)
    return NextResponse.json({ ok: true, logs })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}

export async function DELETE() {
  try {
    await requireSession()
    const supabase = getSupabase()
    await supabase.from('web_logs').delete().neq('id', 0)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
