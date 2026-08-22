/**
 * Gateway abstractions for the checkout system.
 * Each gateway returns a unified PayResult / WithdrawResult.
 */

export type GatewayId = 'pushinpay' | 'paradise' | 'pixgate' | 'blackcat'

export interface PixResult {
  external_id: string
  pix_code: string
  pix_base64: string | null
}

export interface WithdrawResult {
  external_id: string | null
  status: 'pending' | 'completed' | 'failed'
  raw: unknown
}

// ── PushinPay ─────────────────────────────────────────────────────────────────

async function pushinpayCreatePix(
  creds: Record<string, string>,
  amountCents: number,
  description?: string,
): Promise<PixResult> {
  const res = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ value: amountCents, ...(description ? { description } : {}) }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`PushinPay error ${res.status}: ${t}`)
  }
  const d = await res.json()
  return { external_id: d.id, pix_code: d.qr_code, pix_base64: d.qr_code_base64 ?? null }
}

async function pushinpayWithdraw(
  creds: Record<string, string>,
  amountCents: number,
  pixKey: string,
  _pixKeyType: string,
): Promise<WithdrawResult> {
  const res = await fetch('https://api.pushinpay.com.br/api/pix/cashOut', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.api_key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ value: amountCents, pix_key: pixKey }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`PushinPay withdraw error ${res.status}: ${JSON.stringify(d)}`)
  return { external_id: d.id ?? null, status: 'pending', raw: d }
}

// ── Paradise Pags ─────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto'

function fakeDoc() {
  const n = () => Math.floor(Math.random() * 9) + 1
  const d = Array.from({ length: 11 }, (_, i) => (i === 0 ? n() : Math.floor(Math.random() * 10)))
  return d.join('')
}

async function paradiseCreatePix(
  creds: Record<string, string>,
  amountCents: number,
  description?: string,
): Promise<PixResult> {
  const reference = 'CO-' + randomUUID().substring(0, 8).toUpperCase()
  const res = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
    method: 'POST',
    headers: { 'X-API-Key': creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountCents,
      description: description ?? 'Pagamento',
      reference,
      productHash: creds.product_hash || 'prod_41f8d604222951de',
      customer: {
        name: 'Cliente ' + randomUUID().substring(0, 4),
        email: `cliente${randomUUID().substring(0, 6)}@email.com`,
        document: fakeDoc(),
        phone: '11' + Math.floor(900000000 + Math.random() * 99999999),
      },
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Paradise error ${res.status}: ${t}`)
  }
  const d = await res.json()
  return {
    external_id: d.transaction_id ?? d.id,
    pix_code: d.qr_code,
    pix_base64: d.qr_code_base64 ?? null,
  }
}

async function paradiseWithdraw(
  creds: Record<string, string>,
  amountCents: number,
  pixKey: string,
  pixKeyType: string,
): Promise<WithdrawResult> {
  const res = await fetch('https://multi.paradisepags.com/api/v1/withdraw.php', {
    method: 'POST',
    headers: { 'X-API-Key': creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountCents, pix_key: pixKey, pix_key_type: pixKeyType }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`Paradise withdraw error ${res.status}: ${JSON.stringify(d)}`)
  return { external_id: d.transaction_id ?? d.id ?? null, status: 'pending', raw: d }
}

// ── PixGate ───────────────────────────────────────────────────────────────────

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://rastreiofacil.com'
}

async function pixgateCreatePix(
  creds: Record<string, string>,
  amountCents: number,
  description?: string,
): Promise<PixResult> {
  const valorDecimal = (amountCents / 100).toFixed(2)
  const res = await fetch('https://app.pixgateip.com/api/v1/cashin', {
    method: 'POST',
    headers: { Apikey: creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: 'Cliente',
      cpf: fakeDoc(),
      valor: valorDecimal,
      descricao: description ?? 'Pagamento',
      postback: `${getBaseUrl()}/api/checkout/webhooks/pixgate`,
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`PixGate error ${res.status}: ${t}`)
  }
  const d = await res.json()
  return { external_id: d.id, pix_code: d.pix, pix_base64: null }
}

async function pixgateWithdraw(
  creds: Record<string, string>,
  amountCents: number,
  pixKey: string,
  pixKeyType: string,
): Promise<WithdrawResult> {
  const res = await fetch('https://app.pixgateip.com/api/v1/cashout', {
    method: 'POST',
    headers: { Apikey: creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: (amountCents / 100).toFixed(2), chave: pixKey, tipo_chave: pixKeyType }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`PixGate withdraw error ${res.status}: ${JSON.stringify(d)}`)
  return { external_id: d.id ?? null, status: 'pending', raw: d }
}

// ── BlackCat ──────────────────────────────────────────────────────────────────

async function blackcatCreatePix(
  creds: Record<string, string>,
  amountCents: number,
  description?: string,
): Promise<PixResult> {
  const res = await fetch('https://api.blackcatoficial.com/api/sales/create-sale', {
    method: 'POST',
    headers: { 'X-API-Key': creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'pix',
      amount: amountCents,
      description: description ?? 'Pagamento',
      customer: {
        name: 'Cliente ' + randomUUID().substring(0, 4),
        email: `cliente${randomUUID().substring(0, 6)}@email.com`,
        document: fakeDoc(),
        phone: '11' + Math.floor(900000000 + Math.random() * 99999999),
      },
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`BlackCat error ${res.status}: ${t}`)
  }
  const d = await res.json()
  return {
    external_id: d.id ?? d.transaction_id,
    pix_code: d.pix_code ?? d.qr_code,
    pix_base64: d.pix_base64 ?? d.qr_code_base64 ?? null,
  }
}

async function blackcatWithdraw(
  creds: Record<string, string>,
  amountCents: number,
  pixKey: string,
  pixKeyType: string,
): Promise<WithdrawResult> {
  const res = await fetch('https://api.blackcatoficial.com/api/sales/create-withdrawal', {
    method: 'POST',
    headers: { 'X-API-Key': creds.api_key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountCents, pix_key: pixKey, pix_key_type: pixKeyType }),
  })
  const d = await res.json()
  if (!res.ok) throw new Error(`BlackCat withdraw error ${res.status}: ${JSON.stringify(d)}`)
  return { external_id: d.id ?? null, status: 'pending', raw: d }
}

// ── Status check ──────────────────────────────────────────────────────────────

export async function checkTransactionStatus(
  gateway: GatewayId,
  creds: Record<string, string>,
  externalId: string,
): Promise<string> {
  try {
    if (gateway === 'blackcat') {
      const res = await fetch(`https://api.blackcatoficial.com/api/sales/${externalId}/status`, {
        headers: { 'X-API-Key': creds.api_key },
      })
      const d = await res.json()
      return d.status ?? 'pending'
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

// ── Unified dispatch ──────────────────────────────────────────────────────────

export async function gatewayCreatePix(
  gateway: GatewayId,
  creds: Record<string, string>,
  amountCents: number,
  description?: string,
): Promise<PixResult> {
  switch (gateway) {
    case 'pushinpay': return pushinpayCreatePix(creds, amountCents, description)
    case 'paradise':  return paradiseCreatePix(creds, amountCents, description)
    case 'pixgate':   return pixgateCreatePix(creds, amountCents, description)
    case 'blackcat':  return blackcatCreatePix(creds, amountCents, description)
    default: throw new Error(`Unknown gateway: ${gateway}`)
  }
}

export async function gatewayWithdraw(
  gateway: GatewayId,
  creds: Record<string, string>,
  amountCents: number,
  pixKey: string,
  pixKeyType: string,
): Promise<WithdrawResult> {
  switch (gateway) {
    case 'pushinpay': return pushinpayWithdraw(creds, amountCents, pixKey, pixKeyType)
    case 'paradise':  return paradiseWithdraw(creds, amountCents, pixKey, pixKeyType)
    case 'pixgate':   return pixgateWithdraw(creds, amountCents, pixKey, pixKeyType)
    case 'blackcat':  return blackcatWithdraw(creds, amountCents, pixKey, pixKeyType)
    default: throw new Error(`Unknown gateway: ${gateway}`)
  }
}

/** Fields each gateway needs in its credentials object */
export const GATEWAY_FIELDS: Record<GatewayId, { key: string; label: string; placeholder: string }[]> = {
  pushinpay: [{ key: 'api_key', label: 'API Key', placeholder: 'sk_live_...' }],
  paradise:  [
    { key: 'api_key',      label: 'API Key',      placeholder: 'pk_...' },
    { key: 'product_hash', label: 'Product Hash', placeholder: 'prod_...' },
  ],
  pixgate:   [{ key: 'api_key', label: 'API Key', placeholder: '' }],
  blackcat:  [{ key: 'api_key', label: 'API Key', placeholder: '' }],
}

export const GATEWAY_LABELS: Record<GatewayId, string> = {
  pushinpay: 'PushinPay',
  paradise:  'Paradise Pags',
  pixgate:   'PixGate',
  blackcat:  'BlackCat',
}

export const SUPPORTED_GATEWAYS: GatewayId[] = ['pushinpay', 'paradise', 'pixgate', 'blackcat']

export function isValidGateway(g: string): g is GatewayId {
  return SUPPORTED_GATEWAYS.includes(g as GatewayId)
}
