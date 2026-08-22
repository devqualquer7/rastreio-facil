import { NextResponse } from 'next/server'
import { getSession } from '@/lib/ec-auth'
import { db } from '@/lib/ec-supabase'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false })

  // Admin = the first user created (lowest id / earliest created_at)
  try {
    const all = await db.listUsers()
    // listUsers() orders by created_at ASC → first element is the oldest account
    const me = all.find((u: any) => u.username === session.username)
    const first = all[0]
    // Use string comparison to avoid BigInt vs number mismatch on some runtimes
    const is_admin = !!me && !!first && String(me.id) === String(first.id)
    return NextResponse.json({ ok: true, username: session.username, is_admin })
  } catch (e: any) {
    console.error('[ec/me] listUsers error:', e?.message)
    // Fall back: if there is only one user they must be admin
    try {
      const count = await db.countUsers()
      return NextResponse.json({ ok: true, username: session.username, is_admin: count <= 1 })
    } catch {
      return NextResponse.json({ ok: true, username: session.username, is_admin: false })
    }
  }
}
