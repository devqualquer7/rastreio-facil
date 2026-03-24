import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.adminId) return NextResponse.json({ error: 'N\u00e3o autorizado' }, { status: 401 })

    const { id } = await params
    query.deleteClient(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao deletar cliente.' }, { status: 500 })
  }
}
