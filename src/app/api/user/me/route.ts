import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/session'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const session = await getUserSession()
    if (!session?.userId) return NextResponse.json({ error: 'NÃ£o autorizado' }, { status: 401 })

    const user = query.getUserById(session.userId as string) as any
    if (!user) return NextResponse.json({ error: 'UsuÃ¡rio nÃ£o encontrado' }, { status: 404 })

    const { password: _, ...safeUser } = user
    const now = new Date()
    const expires = user.planExpiry ? new Date(user.planExpiry) : null
    const daysLeft = expires ? Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Count tracking codes used
    const trackingCodes = query.getTrackingCodesByUserId(session.userId as string) as any[]
    const trackingUsed = trackingCodes.length
    const trackingLimit = user.maxTrackingCodes || 5

    return NextResponse.json({ ...safeUser, daysLeft, trackingUsed, trackingLimit, expiresAt: user.planExpiry || null })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
