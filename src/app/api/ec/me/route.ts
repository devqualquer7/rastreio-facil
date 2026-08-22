import { NextResponse } from 'next/server'
import { getSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false })

  // Admin = the user with the lowest ID (first account created)
  try {
    const all = await db.listUsers()
    const minId = all.length > 0 ? Math.min(...all.map((u: any) => u.id)) : -1
    const me = all.find((u: any) => u.username === session.username)
    const is_admin = !!me && me.id === minId
    return NextResponse.json({ ok: true, username: session.username, is_admin })
  } catch {
    return NextResponse.json({ ok: true, username: session.username, is_admin: false })
  }
}
