import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const codes = query.getTrackingCodes()
    return NextResponse.json(codes)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { code, clientId } = await request.json()
    let finalCode = code
    if (!finalCode) {
      const r = Math.floor(100000000 + Math.random() * 900000000)
      finalCode = `LT${r}BR`
    }
    const tc = query.createTrackingCode({ code: finalCode.toUpperCase(), clientId: clientId || null })
    return NextResponse.json(tc, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro.' }, { status: 500 })
  }
}
