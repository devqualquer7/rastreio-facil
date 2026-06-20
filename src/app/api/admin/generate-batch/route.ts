/**
 * Batch PIX Link Generator
 *
 * Generates N PIX links for one of the supported gateways.
 * Authenticated via Bearer token (separate from admin session).
 *
 * Request:
 *   POST /api/admin/generate-batch
 *   Authorization: Bearer <BATCH_API_TOKEN>
 *   Content-Type: application/json
 *   Body: { gateway: 'pushin_pf' | 'pushin_pj' | 'paradise' | 'pixgate' | 'pixgate_premium',
 *           value: 425.30, count: 5, description?: string }
 *
 * NOTE on PixGate: requests are processed SEQUENTIALLY with a small delay
 * because the underlying acquirers can reject concurrent requests
 * (NEXUSPAG → HTTP 409 "external_id já existe").
 *
 * NOTE on PixGate Premium: separate account/Apikey, link limit up to R$ 15.000.
 * The acquirer behind it (POSEIDONPAY) VALIDATES the CPF check digits
 * (NEXUSPAG didn't), so we generate a mathematically valid CPF.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const PUSHIN_API_URL   = 'https://api.pushinpay.com.br/api/pix/cashIn'
const PARADISE_API_URL = 'https://multi.paradisepags.com/api/v1/transaction.php'
const PIXGATE_API_URL  = 'https://app.pixgateip.com/api/v1/cashin'
const PARADISE_PRODUCT_HASH = 'prod_41f8d604222951de'

const MAX_COUNT = 50            // safety: max 50 links per call
const MIN_VALUE = 1.00          // R$ 1,00 minimum

// Per-gateway max value (BRL)
const MAX_VALUE_BY_GATEWAY: Record<Gateway, number> = {
  pushin_pf:       500,
  pushin_pj:       500,
  paradise:        500,
  pixgate:         500,
  pixgate_premium: 15_000,
}

// Delay between sequential PixGate calls to avoid acquirer dedup race
const PIXGATE_STAGGER_MS = 350

type Gateway = 'pushin_pf' | 'pushin_pj' | 'paradise' | 'pixgate' | 'pixgate_premium'

type LinkResult = {
  id: string
  qrCode: string
  qrCodeBase64?: string
  value: number   // in BRL
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Generate a mathematically valid CPF (11 digits, with correct check digits).
 * Required by POSEIDONPAY (the acquirer behind PixGate Premium) — it rejects
 * random 11-digit numbers with HTTP 422 "Documento inválido".
 *
 * Algorithm:
 *   1. Generate 9 random digits.
 *   2. Compute first check digit: sum of d[i] * (10 - i) for i in 0..8, mod 11.
 *      If result < 2 → digit = 0; else digit = 11 - result.
 *   3. Compute second check digit: sum of d[i] * (11 - i) for i in 0..9, mod 11.
 *      Same rule.
 *   4. Concatenate all 11 digits.
 */
function generateValidCpf(): string {
  const d: number[] = []
  for (let i = 0; i < 9; i++) d.push(Math.floor(Math.random() * 10))

  // First check digit
  let sum = 0
  for (let i = 0; i < 9; i++) sum += d[i] * (10 - i)
  let v1 = sum % 11
  v1 = v1 < 2 ? 0 : 11 - v1
  d.push(v1)

  // Second check digit
  sum = 0
  for (let i = 0; i < 10; i++) sum += d[i] * (11 - i)
  let v2 = sum % 11
  v2 = v2 < 2 ? 0 : 11 - v2
  d.push(v2)

  return d.join('')
}

// ─────────────────────────────────────────────────────────────
// Single-link generators
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
  const uid = randomUUID().substring(0, 8).toUpperCase()
  const reference = 'RF-BATCH-' + uid
  const uniqueEmail = 'cliente' + uid + '@pagamento.com'
  const uniqueDoc   = generateValidCpf()
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
  const uid = randomUUID().substring(0, 8).toUpperCase()
  // POSEIDONPAY (PixGate Premium acquirer) validates CPF check digits.
  // NEXUSPAG (PixGate regular) doesn't — but we use a valid CPF for both
  // so the same code path works for both variants.
  const validCpf = generateValidCpf()
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
      cpf:       validCpf,
      valor:     valueInReais,
      postback:  postbackUrl,
      ...(description ? { descricao: description } : {}),
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`PixGate HTTP ${res.status}: ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
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
    value:  valueInCents / 100,
  }
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth — Bearer token
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
    const validGateways: Gateway[] = ['pushin_pf', 'pushin_pj', 'paradise', 'pixgate', 'pixgate_premium']
    if (!gateway || !validGateways.includes(gateway)) {
      return NextResponse.json(
        { ok: false, error: 'Gateway inválido. Use: pushin_pf, pushin_pj, paradise, pixgate ou pixgate_premium.' },
        { status: 400 }
      )
    }

    // 4. Validate value (per-gateway limit)
    const valueNum = Number(value)
    const maxValue = MAX_VALUE_BY_GATEWAY[gateway as Gateway]
    if (!isFinite(valueNum) || valueNum < MIN_VALUE) {
      return NextResponse.json(
        { ok: false, error: `Valor mínimo é R$ ${MIN_VALUE.toFixed(2)}.` },
        { status: 400 }
      )
    }
    if (valueNum > maxValue) {
      return NextResponse.json(
        { ok: false, error: `Valor máximo por link em ${gateway} é R$ ${maxValue.toLocaleString('pt-BR')}.` },
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
    } else if (gateway === 'pixgate' || gateway === 'pixgate_premium') {
      // Pick the right Apikey based on the variant
      const envName = gateway === 'pixgate_premium' ? 'PIXGATE_PREMIUM_API_KEY' : 'PIXGATE_API_KEY'
      const apiKey = process.env[envName]
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: `${envName} não configurado.` },
          { status: 503 }
        )
      }
      const postbackUrl =
        process.env.PIXGATE_POSTBACK_URL ||
        new URL('/api/webhooks/pixgate', request.url).toString()
      generator = () => generatePixgate(valueInCents, desc, apiKey, postbackUrl)
    } else {
      return NextResponse.json(
        { ok: false, error: 'Gateway não suportado.' },
        { status: 400 }
      )
    }

    // 8. Generate N links.
    //    PixGate (both variants): SEQUENTIAL with stagger — the upstream
    //    acquirers can reject parallel requests.
    //    Other gateways: PARALLEL via Promise.allSettled.
    const links: LinkResult[] = []
    const failed: string[] = []

    if (gateway === 'pixgate' || gateway === 'pixgate_premium') {
      for (let i = 0; i < countNum; i++) {
        try {
          const link = await generator()
          links.push(link)
        } catch (e: any) {
          failed.push(String(e?.message || e || 'erro desconhecido'))
        }
        if (i < countNum - 1) {
          await sleep(PIXGATE_STAGGER_MS)
        }
      }
    } else {
      const results = await Promise.allSettled(
        Array.from({ length: countNum }, () => generator())
      )
      for (const r of results) {
        if (r.status === 'fulfilled') {
          links.push(r.value)
        } else {
          failed.push(String(r.reason?.message || r.reason || 'erro desconhecido'))
        }
      }
    }

    return NextResponse.json({
      ok:      true,
      gateway,
      count:   countNum,
      value:   valueNum,
      links,
      failed,
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
