import { NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { getActiveMPAccounts } from '@/lib/checkout-mp'

export async function GET() {
  const session = await getCheckoutSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const accounts = await getActiveMPAccounts()
    // Strip access_token — expose only what the frontend needs
    const safe = accounts.map(a => ({
      slot: a.slot,
      mp_user_id: a.mp_user_id,
      public_key: a.public_key,
      is_active: a.is_active,
      connected: a.connected,
    }))
    return NextResponse.json(safe)
  } catch (e: any) {
    console.error('[checkout/mp-accounts]', e)
    return NextResponse.json({ error: e?.message ?? 'Erro ao buscar contas MP' }, { status: 500 })
  }
}
