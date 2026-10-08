import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/ec-auth'
import { db, getSupabase } from '@/lib/ec-supabase'

export async function POST(req: NextRequest) {
  try {
    await requireSession()
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Number(body.limit) || 200, 1000)
    const sales = await db.listSales(limit)

    // Anexa quem gerou cada venda (sale:by:{ref}) num único SELECT — a tela usa
    // isso pra só notificar o DONO do link, nunca o usuário errado.
    try {
      const refs = sales.map((s: any) => s.external_reference).filter(Boolean)
      if (refs.length) {
        const sb = getSupabase()
        const keys = refs.map((r: string) => `sale:by:${r}`)
        const byMap: Record<string, string> = {}
        // Em lotes paralelos de 100: com 500 chaves num único .in() a URL da consulta
        // passava de 17 KB e a resposta ficava lenta (ou falhava e vinha sem created_by).
        const chunks: string[][] = []
        for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100))
        const results = await Promise.all(
          chunks.map(c => sb.from('web_settings').select('key,value').in('key', c))
        )
        for (const { data } of results) {
          for (const row of (data ?? [])) byMap[(row as any).key.replace('sale:by:', '')] = (row as any).value
        }
        for (const s of sales) (s as any).created_by = byMap[s.external_reference] ?? null
      }
    } catch { /* se falhar, segue sem created_by — a tela cai no comportamento antigo */ }

    return NextResponse.json({ ok: true, sales })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    return NextResponse.json({ ok: false, error: 'Erro interno' })
  }
}
