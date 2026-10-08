/**
 * OAuth Import — chamado pelo exe EncryptedSoftware após trocar o código
 * com o MP e salvar a credencial localmente.
 *
 * Body: { access_token, mp_user_id, name }
 * Header: x-ec-import-key = mp_oauth_client_id configurado em Configurações → OAuth MP
 *
 * Sem CORS — chamado direto do processo Node.js (Electron), não do browser.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, addLog } from '@/lib/ec-supabase'
import { encrypt } from '@/lib/ec-crypto'

export async function POST(req: NextRequest) {
  try {
    // Auth: header deve bater com o client_id configurado no site
    const importKey = req.headers.get('x-ec-import-key')
    if (!importKey) {
      return NextResponse.json({ ok: false, error: 'Chave de importação ausente' }, { status: 401 })
    }

    const rows = await db.getSettings(['mp_oauth_client_id'])
    const clientId = rows.find(r => r.key === 'mp_oauth_client_id')?.value

    if (!clientId || importKey !== clientId) {
      await addLog(
        'error',
        `OAuth import: chave inválida (${importKey?.slice(0, 8)}...)`,
        'ec/oauth/import'
      ).catch(() => {})
      return NextResponse.json({ ok: false, error: 'Chave de importação inválida' }, { status: 401 })
    }

    const body = await req.json()
    const { access_token, mp_user_id, name: rawName } = body

    if (!access_token) {
      return NextResponse.json({ ok: false, error: 'access_token obrigatório' }, { status: 400 })
    }
    if (!mp_user_id) {
      return NextResponse.json({ ok: false, error: 'mp_user_id obrigatório' }, { status: 400 })
    }

    const credName  = (rawName || '').trim() || `MP ${mp_user_id}`
    const mpUserId  = String(mp_user_id)

    // Reutiliza slot existente se o mesmo mp_user_id já está cadastrado
    const existing  = await db.getCredByMpUserId(mpUserId)
    const encToken  = await encrypt(access_token)
    const slot      = existing?.slot ?? await db.nextSlot()

    await db.upsertCred({
      slot,
      name:          credName,
      mp_user_id:    mpUserId,
      access_token:  encToken,
      connected:     true,
      health_status: 'ok',
    })

    // Conta NOVA: chega trancada se o admin ligou "bloquear novas"; senão garante que o
    // número do slot (que pode ter sido reaproveitado) não herde um cadeado antigo.
    let lockedOnArrival = false
    if (!existing) {
      lockedOnArrival = await db.getLockNew()
      await db.setSlotLocked(slot, lockedOnArrival).catch(() => {})
    }

    // Ativa automaticamente se não houver conta ativa
    const active = await db.getActiveCred()
    if (!active) {
      await db.setAllInactive()
      await db.updateCred(slot, { is_active: true })
    }

    await addLog(
      'link',
      `OAuth import (exe): slot #${slot} "${credName}" · MP user ${mpUserId}${lockedOnArrival ? ' · chegou bloqueada' : ''}`,
      `slot #${slot}`
    ).catch(() => {})

    return NextResponse.json({ ok: true, slot, name: credName })
  } catch (e: any) {
    console.error('[ec/oauth/import]', e)
    await addLog('error', `OAuth import erro interno: ${e.message}`, 'ec/oauth/import').catch(() => {})
    return NextResponse.json({ ok: false, error: `Erro interno: ${e.message}` }, { status: 500 })
  }
}
