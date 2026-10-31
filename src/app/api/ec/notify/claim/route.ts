/**
 * Chamado pelo exe antes de avisar uma venda aprovada: site e exe usam a mesma
 * chave, então só quem ganhar envia para aquele destinatário.
 *
 * Body: { paymentId, recipient } — recipient é o hash do User Key do Pushover
 * Header: x-ec-import-key = mp_oauth_client_id, igual ao oauth/import
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/ec-supabase'
import { pushClaimKey } from '@/lib/ec-pushover'

export async function POST(req: NextRequest) {
  try {
    const importKey = req.headers.get('x-ec-import-key')
    if (!importKey) return NextResponse.json({ ok: false, error: 'Chave ausente' }, { status: 401 })

    const clientId = await db.getSetting('mp_oauth_client_id')
    if (!clientId || importKey !== clientId) {
      return NextResponse.json({ ok: false, error: 'Chave inválida' }, { status: 401 })
    }

    const { paymentId, recipient } = await req.json()
    if (!/^\d+$/.test(String(paymentId)) || !/^[0-9a-f]{16}$/.test(String(recipient))) {
      return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 })
    }

    const claimed = await db.claimSetting(pushClaimKey(String(paymentId), String(recipient)))
    return NextResponse.json({ ok: true, claimed })
  } catch (e) {
    console.error('[EC notify/claim]', e)
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 })
  }
}
