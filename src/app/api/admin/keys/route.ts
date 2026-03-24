import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

function generateKey() {
  const parts = [
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
  ]
  return `RF-${parts[0]}-${parts[1]}-${parts[2]}`
}

export async function GET() {
  const keys = query.getAllKeys()
  return NextResponse.json(keys)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const count = Math.min(body.count || 1, 50)

    const created = []
    for (let i = 0; i < count; i++) {
      let key = generateKey()
      while (query.getKeyByValue(key)) {
        key = generateKey()
      }
      created.push(query.createKey(key))
    }

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao gerar keys' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  query.deleteKey(id)
  return NextResponse.json({ success: true })
}
