import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.adminId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const users = query.getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
