// src/lib/pixgate.ts — migrado para API nova (Apikey + /api/v1)
const PIXGATE_BASE_URL = 'https://app.pixgateip.com/api/v1'

function getApiKey(): string {
  const apiKey = process.env.PIXGATE_API_KEY
  if (!apiKey) {
    throw new Error('PIXGATE_API_KEY env var is required')
  }
  return apiKey
}

function getHeaders() {
  return {
    'Apikey': getApiKey(),
    'Content-Type': 'application/json',
  }
}

// === Tipos novos (alinhados ao payload da API nova) ===

export interface CreatePixPaymentParams {
  amount: number          // BRL (ex: 100.00)
  description?: string
  postbackUrl: string
  payerName?: string      // default "Cliente <uid>"
  payerDocument?: string  // CPF/CNPJ só dígitos. Se omitido, gera fake.
}

export interface PixGatePaymentResponse {
  id: string              // transaction_id
  pix: string             // copy & paste
  value: number
  status: string          // 'PENDING' no início
  acquirer_used?: string
}

export interface CreatePixCashoutParams {
  amount: number
  beneficiaryName: string
  beneficiaryDocument: string  // CPF/CNPJ só dígitos
  description?: string
}

// === Cash In — gera PIX ===

export async function createPixPayment(
  params: CreatePixPaymentParams
): Promise<PixGatePaymentResponse> {
  const uid = Math.random().toString(36).slice(2, 10).toUpperCase()
  const fakeDoc = String(10_000_000_000 + Math.floor(Math.random() * 89_999_999_999))

  const body = {
    nome:      params.payerName     || `Cliente ${uid}`,
    cpf:       params.payerDocument || fakeDoc,
    valor:     params.amount.toFixed(2),
    descricao: params.description   || 'Pagamento PIX',
    postback:  params.postbackUrl,
    device:    'web',
  }

  const response = await fetch(`${PIXGATE_BASE_URL}/cashin`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate createPixPayment error:', response.status, err)
    throw new Error(`PixGate API error: ${response.status} — ${err.slice(0, 200)}`)
  }
  return response.json()
}

// === Cash Out — envia transferência PIX ===

export async function createPixCashout(
  params: CreatePixCashoutParams
): Promise<any> {
  const body = {
    nome:      params.beneficiaryName,
    cpf:       params.beneficiaryDocument,
    valor:     params.amount.toFixed(2),
    descricao: params.description || 'Saque',
  }

  const response = await fetch(`${PIXGATE_BASE_URL}/cashout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate createPixCashout error:', response.status, err)
    throw new Error(`PixGate API error: ${response.status} — ${err.slice(0, 200)}`)
  }
  return response.json()
}

// === ATENÇÃO: API nova NÃO tem endpoints de consulta ===
//
// A doc oficial diz: "PIXGATE doesn't have a public status-query endpoint
// — they only notify us when a payment is confirmed via this webhook"
//
// Por isso getTransaction(), listTransactions() e getBalance() foram REMOVIDAS.
// Use o webhook (postback) pra saber quando um PIX é pago, e o endpoint
// /api/admin/check-payment-status-pixgate pra consultar o status local
// (que é atualizado pelo webhook).

// === Validação de assinatura do webhook ===
// A doc nova NÃO menciona assinatura HMAC. Se você quiser validação,
// confirme com o suporte do PixGate qual é o cabeçalho/algoritmo atual.
// Por enquanto deixo como no-op (sempre true) — segurança via HTTPS + IP
// de origem dos servidores deles.
export function validateWebhookSignature(
  _payload: any,
  _signature: string,
  _timestamp: string
): boolean {
  // TODO: implementar quando o PixGate publicar como assinar.
  return true
}
