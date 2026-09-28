import { randomUUID } from 'node:crypto'

const BASE = 'https://api.mercadopago.com'

const CHROME_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
]

function stealthHeaders(auth: string, contentType = 'application/json', idem = false): Record<string, string> {
  const ua = CHROME_UAS[Math.floor(Math.random() * CHROME_UAS.length)]
  const major = ua.match(/Chrome\/(\d+)/)?.[1] || '133'
  return {
    'sec-ch-ua':           `"Not(A:Brand";v="99", "Google Chrome";v="${major}", "Chromium";v="${major}"`,
    'sec-ch-ua-mobile':    '?0',
    'sec-ch-ua-platform':  ua.includes('Mac') ? '"macOS"' : '"Windows"',
    'accept':              'application/json, text/plain, */*',
    'accept-language':     'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'user-agent':          ua,
    'sec-fetch-site':      'same-origin',
    'sec-fetch-mode':      'cors',
    'sec-fetch-dest':      'empty',
    'authorization':       'Bearer ' + auth,
    'content-type':        contentType,
    ...(idem ? { 'x-idempotency-key': randomUUID() } : {}),
  }
}

async function parseJson(resp: Response) {
  const text = await resp.text()
  let data: any
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!resp.ok) {
    const msg = data?.message || data?.error || `HTTP ${resp.status}`
    const err: any = new Error(msg); err.status = resp.status; err.data = data
    throw err
  }
  return data
}

export class MPAPI {
  constructor(private token: string) {}

  async me() {
    const r = await fetch(`${BASE}/users/me`, { headers: stealthHeaders(this.token) })
    return await parseJson(r)
  }

  async createPreference(input: {
    title: string
    amount: number
    externalReference?: string
    payerEmail?: string
    categoryId?: string | null
    excludedPaymentTypes?: string[]
    excludedPaymentMethods?: string[]
    statementDescriptor?: string
    backUrls?: { success?: string; failure?: string; pending?: string }
    autoReturn?: string
  }) {
    const item: any = {
      id: randomUUID(),
      title: input.title,
      description: input.title,
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(input.amount),
    }
    if (input.categoryId?.trim()) item.category_id = input.categoryId.trim()

    const body: any = {
      items: [item],
      external_reference: input.externalReference || randomUUID(),
    }

    if (input.payerEmail) body.payer = { email: input.payerEmail }
    if (input.backUrls) body.back_urls = input.backUrls
    if (input.autoReturn) body.auto_return = input.autoReturn

    if (input.statementDescriptor) {
      const clean = input.statementDescriptor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22)
      if (clean) body.statement_descriptor = clean
    }
    if (input.excludedPaymentTypes?.length || input.excludedPaymentMethods?.length) {
      const FORBIDDEN = new Set(['account_money'])
      const cleanTypes   = (input.excludedPaymentTypes   ?? []).filter(t => t && !FORBIDDEN.has(t))
      const cleanMethods = (input.excludedPaymentMethods ?? []).filter(m => m && !FORBIDDEN.has(m))
      const pm: any = {}
      if (cleanTypes.length)   pm.excluded_payment_types   = cleanTypes.map(t => ({ id: t }))
      if (cleanMethods.length) pm.excluded_payment_methods = cleanMethods.map(m => ({ id: m }))
      if (Object.keys(pm).length) body.payment_methods = pm
    }

    const r = await fetch(`${BASE}/checkout/preferences`, {
      method: 'POST',
      headers: stealthHeaders(this.token, 'application/json', true),
      body: JSON.stringify(body),
    })
    return await parseJson(r)
  }

  async getPayment(idOrRef: string) {
    const r = await fetch(
      `${BASE}/v1/payments/${encodeURIComponent(idOrRef)}`,
      { headers: stealthHeaders(this.token) }
    )
    if (r.ok) return await r.json()
    const r2 = await fetch(
      `${BASE}/v1/payments/search?external_reference=${encodeURIComponent(idOrRef)}&limit=1`,
      { headers: stealthHeaders(this.token) }
    )
    if (r2.ok) {
      const d: any = await r2.json()
      if (d.results?.length) return d.results[0]
    }
    throw new Error('Pagamento não encontrado')
  }

  async searchPayments(input: {
    externalReference?: string
    preferenceId?: string
    status?: string
    limit?: number
    offset?: number
    dateFrom?: string
    dateTo?: string
  }) {
    const params = new URLSearchParams({
      limit: String(input.limit ?? 50),
      offset: String(input.offset ?? 0),
      sort: 'date_created',
      criteria: 'desc',
    })
    if (input.externalReference) params.set('external_reference', input.externalReference)
    if (input.preferenceId)      params.set('preference_id', input.preferenceId)
    if (input.status && input.status !== 'todos') params.set('status', input.status)
    if (input.dateFrom) params.set('begin_date', `${input.dateFrom}T00:00:00.000-03:00`)
    if (input.dateTo)   params.set('end_date',   `${input.dateTo}T23:59:59.999-03:00`)

    const r = await fetch(`${BASE}/v1/payments/search?${params}`, {
      headers: stealthHeaders(this.token),
    })
    return await parseJson(r)
  }

  async refund(paymentId: string) {
    const r = await fetch(
      `${BASE}/v1/payments/${paymentId}/refunds`,
      { method: 'POST', headers: stealthHeaders(this.token, 'application/json', true), body: '{}' }
    )
    return await parseJson(r)
  }

  async cancel(paymentId: string) {
    const r = await fetch(
      `${BASE}/v1/payments/${paymentId}`,
      {
        method: 'PUT',
        headers: stealthHeaders(this.token, 'application/json', true),
        body: JSON.stringify({ status: 'cancelled' }),
      }
    )
    return await parseJson(r)
  }

  async expirePreference(prefId: string) {
    const past = new Date(Date.now() - 60_000).toISOString()
    await fetch(`${BASE}/checkout/preferences/${encodeURIComponent(prefId)}`, {
      method: 'PUT',
      headers: stealthHeaders(this.token, 'application/json', true),
      body: JSON.stringify({ expires: true, expiration_date_to: past }),
    })
  }
}
