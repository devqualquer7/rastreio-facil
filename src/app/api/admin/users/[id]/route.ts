import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const user = query.getUserById(id)
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const { action, days, trackings } = body

    if (action === 'toggle_active') {
      query.updateUser(id, { active: user.active ? 0 : 1 })
    } else if (action === 'add_days' && days) {
      query.addDaysToUser(id, Number(days))
    } else if (action === 'add_trackings' && trackings) {
      query.addTrackingsToUser(id, Number(trackings))
    } else if (action === 'remove_days' && days) {
      query.addDaysToUser(id, -Number(days))
    } else if (action === 'remove_trackings' && trackings) {
      const newLimit = Math.max(0, (user.trackingLimit || 0) - Number(trackings))
      query.updateUser(id, { trackingLimit: newLimit })
    } else if (action === 'set_expiry' && body.expiresAt) {
      query.updateUser(id, { expiresAt: new Date(body.expiresAt).toISOString() })
    }

    const updated = query.getUserById(id)
    const { password: _, ...safe } = updated
    return NextResponse.json(safe)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
