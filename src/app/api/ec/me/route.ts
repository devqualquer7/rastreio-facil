import { NextResponse } from 'next/server'
import { getSession } from '@/lib/ec-auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false })

  // Admin is determined by username match against ADMIN_USERNAME env var
  // Falls back to 'foster' — the setup-production.js default
  const adminUsername = process.env.ADMIN_USERNAME || 'foster'
  const is_admin = session.username === adminUsername

  return NextResponse.json({ ok: true, username: session.username, is_admin })
}
