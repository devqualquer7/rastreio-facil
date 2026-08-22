import { NextResponse } from 'next/server'
import { getSession } from '@/lib/ec-auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ ok: false })
  return NextResponse.json({ ok: true, username: session.username })
}
