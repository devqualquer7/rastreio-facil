import { db, addLog } from '@/lib/ec-supabase'

/* ============================================================================
   UTMIFY — envia a venda APROVADA pra API de Pedidos da UTMIFY.
   Token individual por usuário (igual Pushover): key `utmify:{username}`.
   Endpoint: POST https://api.utmify.com.br/api-credentials/orders
   Header:   x-api-token: <token>
   Só dispara em venda paga (status "paid").
   ============================================================================ */

const UTMIFY_URL = 'https://api.utmify.com.br/api-credentials/orders'
const PLATFORM = 'EncryptedSoftware'

export interface UtmifyConfig {
  enabled: boolean
  apiToken: string
}

const DEFAULT: UtmifyConfig = { enabled: false, apiToken: '' }

function keyFor(username: string) { return `utmify:${username}` }

export async function getUtmifyConfig(username: string): Promise<UtmifyConfig> {
  try {
    const raw = await db.getSetting(keyFor(username))
    if (!raw) return { ...DEFAULT }
    const p = JSON.parse(raw)
    return { enabled: !!p.enabled, apiToken: p.apiToken || '' }
  } catch { return { ...DEFAULT } }
}

export async function saveUtmifyConfig(username: string, cfg: Partial<UtmifyConfig>): Promise<UtmifyConfig> {
  const cur = await getUtmifyConfig(username)
  const merged: UtmifyConfig = {
    enabled: cfg.enabled ?? cur.enabled,
    apiToken: (cfg.apiToken ?? cur.apiToken).trim(),
  }
  await db.setSetting(keyFor(username), JSON.stringify(merged))
  return merged
}

// UTMIFY quer data UTC no formato "YYYY-MM-DD HH:MM:SS"
function utmifyDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

// payment_type_id do MP → método aceito pela UTMIFY
function utmifyMethod(typeId?: string | null, methodId?: string | null): string {
  const t = (typeId || '').toLowerCase(), m = (methodId || '').toLowerCase()
  if (m === 'pix' || t === 'bank_transfer' || t === 'pix') return 'pix'
  if (t === 'ticket' || m.includes('bol')) return 'boleto'
  if (t === 'credit_card' || t === 'debit_card') return 'credit_card'
  return 'credit_card'
}

function centsFrom(v: any): number {
  const n = Number(v || 0)
  return Math.max(0, Math.round(n * 100))
}

/** Monta o payload de Pedido da UTMIFY a partir de uma venda do sistema. */
function buildOrder(sale: any, opts?: { isTest?: boolean }) {
  const now = new Date()
  const created = sale.created_at ? new Date(sale.created_at) : now
  const approved = sale.date_approved ? new Date(sale.date_approved) : now
  const gross = centsFrom(sale.amount)
  const net = sale.net_amount != null ? centsFrom(sale.net_amount) : gross
  const fee = Math.max(0, gross - net)

  return {
    orderId: String(sale.external_reference || sale.mp_payment_id || sale.id),
    platform: PLATFORM,
    paymentMethod: utmifyMethod(sale.payment_type_id, sale.payment_method_id),
    status: 'paid',
    createdAt: utmifyDate(created),
    approvedDate: utmifyDate(approved),
    refundedAt: null,
    customer: {
      name: sale.payer_name || 'Cliente',
      email: sale.payer_email || 'sememail@encrypted.local',
      phone: null,
      document: null,
      country: 'BR',
    },
    products: [{
      id: String(sale.external_reference || sale.id),
      name: sale.title || 'Pagamento',
      planId: null,
      planName: null,
      quantity: 1,
      priceInCents: gross,
    }],
    trackingParameters: {
      src: null, sck: null,
      utm_source: sale.utm_source || null,
      utm_campaign: sale.utm_campaign || null,
      utm_medium: sale.utm_medium || null,
      utm_content: sale.utm_content || null,
      utm_term: sale.utm_term || null,
    },
    commission: {
      totalPriceInCents: gross,
      gatewayFeeInCents: fee,
      userCommissionInCents: net,
      currency: 'BRL',
    },
    isTest: !!opts?.isTest,
  }
}

/** Envio bruto com token explícito. Retorna também o corpo da resposta pra diagnóstico. */
export async function sendUtmifyRaw(apiToken: string, order: any): Promise<{ ok: boolean; error?: string; body?: string }> {
  if (!apiToken) return { ok: false, error: 'API Token ausente' }
  try {
    const r = await fetch(UTMIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-token': apiToken },
      body: JSON.stringify(order),
    })
    const txt = await r.text().catch(() => '')
    // A UTMIFY responde 200 mesmo com token inválido (valida async). Tratamos 2xx como aceito.
    if (r.ok) return { ok: true, body: txt.slice(0, 300) }
    return { ok: false, error: `HTTP ${r.status}${txt ? ' · ' + txt.slice(0, 200) : ''}`, body: txt.slice(0, 300) }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Falha de rede' }
  }
}

/**
 * Dispara uma venda pra UTMIFY do usuário DONO, respeitando o enabled dele. Só paga.
 * Loga o resultado (visível em Logs) pra dar pra diagnosticar por que (não) enviou.
 */
export async function sendUtmifyForUser(username: string | null | undefined, sale: any): Promise<void> {
  const ref = sale?.external_reference || sale?.id || '?'
  if (!username) {
    await addLog('status', `UTMIFY: pulado (venda ${ref} sem dono/usuário atribuído)`, 'utmify').catch(() => {})
    return
  }
  try {
    const cfg = await getUtmifyConfig(username)
    if (!cfg.enabled) { await addLog('status', `UTMIFY: desligado pra @${username} (venda ${ref})`, 'utmify', username).catch(() => {}); return }
    if (!cfg.apiToken) { await addLog('status', `UTMIFY: sem token pra @${username} (venda ${ref})`, 'utmify', username).catch(() => {}); return }
    const r = await sendUtmifyRaw(cfg.apiToken, buildOrder(sale))
    if (r.ok) await addLog('status', `UTMIFY: venda enviada ✓ (${ref})`, 'utmify', username).catch(() => {})
    else await addLog('error', `UTMIFY: falha ao enviar (${ref}) · ${r.error}`, 'utmify', username).catch(() => {})
  } catch (e: any) {
    await addLog('error', `UTMIFY: erro (${ref}) · ${e?.message || e}`, 'utmify', username).catch(() => {})
  }
}

/** Pedido de teste pro botão do modal. isTest:false pra APARECER no painel da UTMIFY. */
export async function sendUtmifyTest(apiToken: string): Promise<{ ok: boolean; error?: string; body?: string }> {
  const order = buildOrder({
    external_reference: `TESTE-${PLATFORM}-` + Math.random().toString(36).slice(2, 8).toUpperCase(),
    title: 'TESTE — EncryptedSoftware (pode apagar)',
    amount: 19.9, net_amount: 19.2,
    payment_type_id: 'bank_transfer', payment_method_id: 'pix',
    payer_email: 'teste@encrypted.local',
    created_at: new Date().toISOString(), date_approved: new Date().toISOString(),
  }, { isTest: false })
  return sendUtmifyRaw(apiToken, order)
}
