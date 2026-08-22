import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

// DELETE /api/studio/modelos/:id — delete a cloud model
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession()
    const { id } = await params
    if (!id) return NextResponse.json({ erro: 'id_invalido' }, { status: 400 })
    await db.deleteStudioModel(id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ erro: 'nao_autenticado' }, { status: 401 })
    console.error('[Studio] DELETE /api/studio/modelos/:id error:', e)
    return NextResponse.json({ erro: 'falha_ao_apagar' }, { status: 500 })
  }
}
