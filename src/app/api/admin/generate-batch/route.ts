/**
 * Batch PIX Link Generator
 *
 * Generates N PIX links in parallel for one of the supported gateways.
 * Authenticated via Bearer token (separate from admin session).
 *
 * This route is CONSUMED by the EncryptedSoftware desktop app to automate
 * MP cash-out flow for the manager.
 *
 * Request:
 *   POST /api/admin/generate-batch
 *   Authorization: Bearer <BATCH_API_TOKEN>
 *   Content-Type: application/json
 *   Body: { gateway: 'pushin_pf' | 'pushin_pj' | 'paradise' | 'pixgate', value: 425.30, count: 5, description?: string }
 *
 * Response (200):
 *   { ok: true, gateway: 'pixgate', count: 5, value: 425.30, links: [...], failed: [] }
 *
 * Response (4xx/5xx):
 *   { ok: false, error: '...' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const PUSHIN_API_URL   = 'https://api.pushinpay.com.br/api/pix/cashIn'
const PARADISE_API_URL = 'https://multi.paradisepags.com/api/v1/transaction.php'
const PIXGATE_API_URL  = 'https://app.pixgateip.com/api/v1/cashin'
const PARADISE_PRODUCT_HASH = 'prod_41f8d604222951de'

const MAX_COUNT  = 50            // safety: max 50 links per call
const MIN_VALUE  = 1.00          // R$ 1,00 minimum
const MAX_VALUE  = 500.00        // R$ 500,00 maximum (Pushin limit)

type Gateway = 'pushin_pf' | 'pushin_pj' | 'paradise' | 'pixgate'

type LinkResult = {
  id: string
  qrCode: string
  qrCodeBase64?: string
  value: number   // in BRL
}

// ─────────────────────────────────────────────────────────────
// Single-link generators (same logic as existing routes)
// ─────────────────────────────────────────────────────────────

async function generatePushin(
  valueInCents: number,
  description: string | undefined,
  token: string
): Promise<LinkResult> {
  const res = await fetch(PUSHIN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      value: valueInCents,
      ...(description ? { description } : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Pushin HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    id:           String(data.id),
    qrCode:       data.qr_code,
    qrCodeBase64: data.qr_code_base64,
    value:        valueInCents / 100,
  }
}

async function generateParadise(
  valueInCents: number,
  description: string | undefined,
  apiKey: string
): Promise<LinkResult> {
  // Generate unique customer data so Paradise doesn't deduplicate transactions
  const uid = randomUUID().substring(0, 8).toUpperCase()
  const reference = 'RF-BATCH-' + uid
  const uniqueEmail = 'cliente' + uid + '@pagamento.com'
  const uniqueDoc   = String(10000000000 + Math.floor(Math.random() * 89999999999))
  const uniquePhone = '11' + String(900000000 + Math.floor(Math.random() * 99999999))

  const res = await fetch(PARADISE_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount:      valueInCents,
      description: description || 'Pagamento PIX',
      reference,
      productHash: PARADISE_PRODUCT_HASH,
      customer: {
        name:     'Cliente ' + uid,
        email:    uniqueEmail,
        document: uniqueDoc,
        phone:    uniquePhone,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Paradise HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    id:           String(data.transaction_id),
    qrCode:       data.qr_code,
    qrCodeBase64: data.qr_code_base64,
    value:        valueInCents / 100,
  }
}

async function generatePixgate(
  valueInCents: number,
  description: string | undefined,
  apiKey: string,
  postbackUrl: string
): Promise<LinkResult> {
  // PIXGATE requires nome + cpf — generate uniques to avoid dedup across batch
  const uid = randomUUID().substring(0, 8).toUpperCase()
  const uniqueDoc = String(10000000000 + Math.floor(Math.random() * 89999999999))

  // PIXGATE wants "valor" in REAIS as string (e.g. "100.00"), NOT cents
  const valueInReais = (valueInCents / 100).toFixed(2)

  const res = await fetch(PIXGATE_API_URL, {
    method: 'POST',
    headers: {
      'Apikey': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nome:      'Cliente ' + uid,
      cpf:       uniqueDoc,
      valor:     valueInReais,
      // CRITICAL: postback URL is sent per-request (PIXGATE has no global webhook config).
      // Without this, PIXGATE silently confirms the payment but never tells us.
      postback:  postbackUrl,
      ...(description ? { descricao: description } : {}),
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`PixGate HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()

  // PixGate returns { statusCode, id, pix, value, status, acquirer_used }
  // Defensive: also accept "qr_code" / "qrCode" if API ever changes shape
  const qrCode = data.pix || data.qr_code || data.qrCode
  if (!qrCode) {
    throw new Error('PixGate: campo "pix" ausente na resposta')
  }
  if (!data.id) {
    throw new Error('PixGate: campo "id" ausente na resposta')
  }

  return {
    id:     String(data.id),
    qrCode,
    // PixGate doesn't return base64 — leave undefined; client renders QR from qrCode string
    value:  valueInCents / 100,
  }
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — Bearer token (separate from admin session)
    const expectedToken = process.env.BATCH_API_TOKEN
    if (!expectedToken) {
      return NextResponse.json(
        { ok: false, error: 'BATCH_API_TOKEN não configurado no servidor.' },
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
      return NextResponse.json(
        { ok: false, error: 'Body JSON inválido.' },
        { status: 400 }
      )
    }

    const { gateway, value, count, description } = body || {}

    // 3. Validate gateway
    const validGateways: Gateway[] = ['pushin_pf', 'pushin_pj', 'paradise', 'pixgate']
    if (!gateway || !validGateways.includes(gateway)) {
      return NextResponse.json(
        { ok: false, error: 'Gateway inválido. Use: pushin_pf, pushin_pj, paradise ou pixgate.' },
        { status: 400 }
      )
    }

    // 4. Validate value
    const valueNum = Number(value)
    if (!isFinite(valueNum) || valueNum < MIN_VALUE) {
      return NextResponse.json(
        { ok: false, error: `Valor mínimo é R$ ${MIN_VALUE.toFixed(2)}.` },
        { status: 400 }
      )
    }
    if (valueNum > MAX_VALUE) {
      return NextResponse.json(
        { ok: false, error: `Valor máximo por link é R$ ${MAX_VALUE.toFixed(2)}.` },
        { status: 400 }
      )
    }
    const valueInCents = Math.round(valueNum * 100)

    // 5. Validate count
    const countNum = Number(count)
    if (!Number.isInteger(countNum) || countNum < 1 || countNum > MAX_COUNT) {
      return NextResponse.json(
        { ok: false, error: `Quantidade deve ser entre 1 e ${MAX_COUNT}.` },
        { status: 400 }
      )
    }

    // 6. Validate description (optional, max 100 chars)
    const desc: string | undefined =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim().slice(0, 100)
        : undefined

    // 7. Resolve credentials based on gateway
    let generator: () => Promise<LinkResult>
    if (gateway === 'pushin_pf') {
      const token = process.env.PUSHINPAY_LINKS_TOKEN
      if (!token) {
        return NextResponse.json(
          { ok: false, error: 'PUSHINPAY_LINKS_TOKEN não configurado.' },
          { status: 503 }
        )
      }
      generator = () => generatePushin(valueInCents, desc, token)
    } else if (gateway === 'pushin_pj') {
      const token = process.env.PUSHINPAY_LINKS_PJ_TOKEN
      if (!token) {
        return NextResponse.json(
          { ok: false, error: 'PUSHINPAY_LINKS_PJ_TOKEN não configurado.' },
          { status: 503 }
        )
      }
      generator = () => generatePushin(valueInCents, desc, token)
    } else if (gateway === 'paradise') {
      const apiKey = process.env.PARADISE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: 'PARADISE_API_KEY não configurado.' },
          { status: 503 }
        )
      }
      generator = () => generateParadise(valueInCents, desc, apiKey)
    } else {
      // pixgate
      const apiKey = process.env.PIXGATE_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: 'PIXGATE_API_KEY não configurado.' },
          { status: 503 }
        )
      }
      // Build the postback URL from the request's own host so it works
      // in any environment (production, preview, local, etc).
      // Falls back to PIXGATE_POSTBACK_URL env if set, else uses request host.
      const postbackUrl =
        process.env.PIXGATE_POSTBACK_URL ||
        new URL('/api/webhooks/pixgate', request.url).toString()
      generator = () => generatePixgate(valueInCents, desc, apiKey, postbackUrl)
    }

    // 8. Generate N links in parallel using Promise.allSettled
    //    so that one failure doesn't kill the whole batch
    const results = await Promise.allSettled(
      Array.from({ length: countNum }, () => generator())
    )

    const links: LinkResult[] = []
    const failed: string[] = []

    for (const r of results) {
      if (r.status === 'fulfilled') {
        links.push(r.value)
      } else {
        failed.push(String(r.reason?.message || r.reason || 'erro desconhecido'))
      }
    }

    return NextResponse.json({
      ok:      true,
      gateway,
      count:   countNum,
      value:   valueNum,
      links,
      failed,    // empty array if all succeeded
      summary: `${links.length} de ${countNum} links gerados${failed.length ? ` · ${failed.length} falharam` : ''}`,
    })

  } catch (error: any) {
    console.error('[generate-batch] unexpected error:', error)
    return NextResponse.json(
      { ok: false, error: 'Erro interno: ' + (error?.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
