import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    if (!code) {
      return NextResponse.json({ error: 'Có de rastreio não fornecido.' }, { status: 400 })
    }
    const trackingCode = query.getTrackingCodeByCode(code.toUpperCase())
    if (!trackingCode) {
      return NextResponse.json({ error: 'Có de rastreio não encontrado.' }, { status: 404 })
    }
    return NextResponse.json(trackingCode)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar informações.' }, { status: 500 })
  }
}
