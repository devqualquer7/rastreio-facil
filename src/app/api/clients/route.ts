import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const clients = query.getClients()
    return NextResponse.json(clients)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar clientes.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone } = await request.json()
    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    }
    const client = query.createClient({ name, email, phone })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao criar cliente.' }, { status: 500 })
  }
}
