import { NextRequest, NextResponse } from 'next/server'
import { getCheckoutSession } from '@/lib/checkout-session'
import { codb } from '@/lib/checkout-db'
import crypto from 'crypto'

function generateKey(): string {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase()
  return `CO-${seg()}-${seg()}-${seg()}`
}

export async function GET() {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  return NextResponse.json(codb.getAllKeys())
}

export async function POST(req: NextRequest) {
  const session = await getCheckoutSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const count = Math.min(Math.max(parseInt(body.count ?? '1', 10), 1), 50)

  const created = []
  for (let i = 0; i < count; i++) {
    let keyVal = generateKey()
    // Retry on collision (extremely rare)
    for (let attempt = 0; attempt < 5; attempt++) {
      if (!codb.getKeyByValue(keyVal)) break
      keyVal = generateKey()
    }
    created.push(codb.createKey(keyVal))
  }

  return NextResponse.json(created)
}
