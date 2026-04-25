/**
 * Batch PIX Status Checker
 *
 * Checks the payment status of N PIX transactions in parallel.
 * Authenticated via Bearer token (same as generate-batch).
 *
 * Request:
 *   POST /api/admin/check-batch-status
 *   Authorization: Bearer <BATCH_API_TOKEN>
 *   Content-Type: application/json
 *   Body: {
 *     gateway: 'pushin_pf' | 'pushin_pj' | 'paradise',
 *     ids: ['transaction-id-1', 'transaction-id-2', ...]
 *   }
 *
 * Response (200):
 *   {
 *     ok: true,
 *     statuses: [
 *       { id: 'xxx', status: 'paid', paid: true },
 *       { id: 'yyy', status: 'pending', paid: false },
 *       ...
 *     ]
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'

type Gateway = 'pushin_pf' | 'pushin_pj' | 'paradise'

const MAX_IDS = 100   // safety: max 100 IDs per call

type StatusResult = {
  id: string
  status: string   // 'paid' | 'pending' | 'expired' | 'error' | etc
  paid: boolean
}

// ─────────────────────────────────────────────────────────────
// Single status check (per ID, in parallel via Promise.all)
// ─────────────────────────────────────────────────────────────

async function checkPushinStatus(id: string, token: string): Promise<StatusResult> {
  try {
    const res = await fetch(`https://api.pushinpay.com.br/api/transactions/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      return { id, status: 'pending', paid: false }
    }

    const data = await res.json()
    const status = (data.status || '').toString().toLowerCase()
    const hasEndToEnd = !!(data.end_to_end_id || data.endToEndId || data.e2e_id)
    const isPaid = hasEndToEnd ||
      ['paid', 'completed', 'approved', 'confirmed', 'received'].includes(status)

    return {
      id,
      status: isPaid ? 'paid' : (status || 'pending'),
      paid: isPaid,
    }
  } catch {
    return { id, status: 'error', paid: false }
  }
}

async function checkParadiseStatus(id: string, apiKey: string): Promise<StatusResult> {
  try {
    const res = await fetch(
      `https://multi.paradisepags.com/api/v1/query.php?action=get_transaction&id=${id}`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      return { id, status: 'pending', paid: false }
    }

    const data = await res.json()
    const status = (data.status || '').toString().toLowerCase()
    const isPaid = ['approved', 'paid', 'completed'].includes(status)

    return {
      id,
      status: isPaid ? 'paid' : (status || 'pending'),
      paid: isPaid,
    }
  } catch {
    return { id, status: 'error', paid: false }
  }
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — Bearer token (same as generate-batch)
    const expectedToken = process.env.BATCH_API_TOKEN
    if (!expectedToken) {
      return NextResponse.json(
        { ok: false, error: 'BATCH_API_TOKEN não configurado.' },
        { status: 503 }
      )
    }

    const authHeader = request.headers.get('authorization') || ''
    const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        { ok: false, error: 'Token inválido.' },
        { status: 401 }
      )
    }

    // 2. Parse body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body inválido.' }, { status: 400 })
    }

    const { gateway, ids } = body || {}

    // 3. Validate
    if (!gateway || !['pushin_pf', 'pushin_pj', 'paradise'].includes(gateway)) {
      return NextResponse.json(
        { ok: false, error: 'Gateway inválido.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'IDs são obrigatórios.' },
        { status: 400 }
      )
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { ok: false, error: `Máximo ${MAX_IDS} IDs por chamada.` },
        { status: 400 }
      )
    }

    // 4. Resolve credentials
    let checker: (id: string) => Promise<StatusResult>
    if (gateway === 'pushin_pf') {
      const token = process.env.PUSHINPAY_LINKS_TOKEN
      if (!token) {
        return NextResponse.json(
          { ok: false, error: 'PUSHINPAY_LINKS_TOKEN não configurado.' },
          { status: 503 }
        )
      }
      checker = (id: string) => checkPushinStatus(id, token)
    } else if (gateway === 'pushin_pj') {
      const token = process.env.PUSHINPAY_LINKS_PJ_TOKEN
      if (!token) {
        return NextResponse.json(
          { ok: false, error: 'PUSHINPAY_LINKS_PJ_TOKEN não configurado.' },
          { status: 503 }
        )
      }
      checker = (id: string) => checkPushinStatus(id, token)
    } else {
      // paradise
      const apiKey = process.env.PARADISE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: 'PARADISE_API_KEY não configurado.' },
          { status: 503 }
        )
      }
      checker = (id: string) => checkParadiseStatus(id, apiKey)
    }

    // 5. Check statuses in parallel
    const validIds = ids
      .map((x: any) => String(x).trim())
      .filter((x: string) => x.length > 0)
      .slice(0, MAX_IDS)

    const statuses = await Promise.all(validIds.map(id => checker(id)))

    return NextResponse.json({
      ok: true,
      gateway,
      statuses,
    })

  } catch (error: any) {
    console.error('[check-batch-status] unexpected error:', error)
    return NextResponse.json(
      { ok: false, error: 'Erro interno: ' + (error?.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
