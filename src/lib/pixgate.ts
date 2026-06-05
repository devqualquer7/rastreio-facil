// src/lib/pixgate.ts — drop-in compatível com a API nova (Apikey + /api/v1)
// Mantém todos os tipos e funções antigos pra não quebrar imports existentes,
// mas internamente usa a API nova do PixGate.

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

// ─── Tipos antigos mantidos por compatibilidade ──────────────────────

export interface PixGateCustomer {
  name: string
  email: string
  phone: string
  documentType: 'CPF' | 'CNPJ'
  document: string
}

export interface PixGateItem {
  title: string
  quantity: number
  amount: number
  tangible: boolean
}

export interface CreatePixPaymentParams {
  amount: number
  sellerExternalRef?: string
  customer?: PixGateCustomer
  items?: PixGateItem[]
  postbackUrl: string
  metadata?: Record<string, any>
  description?: string
}

export interface PixGatePaymentResponse {
  success: boolean
  data: {
    id: string
    status: string
    amount: number
    pix: {
      qrcode: string
      copyPaste: string
      expirationDate: string
    }
    createdAt: string
  }
}

export interface PixGateTransactionResponse {
  success: boolean
  data: {
    id: string
    status: string
    amount: number
    paymentMethod: string
    customer: any
    items: any[]
    pix: any
    createdAt: string
    paidAt?: string
  }
}

export interface PixGateBalanceResponse {
  success: boolean
  data: {
    available: number
    pending: number
    blocked: number
    currency: string
  }
}

// ─── createPixPayment — chama a API nova, adapta resposta ───────────

export async function createPixPayment(
  params: CreatePixPaymentParams
): Promise<PixGatePaymentResponse> {
  // Gera CPF fake se cliente não tiver
  const fakeDoc = String(10_000_000_000 + Math.floor(Math.random() * 89_999_999_999))
  const fallbackName = 'Cliente ' + Math.random().toString(36).slice(2, 10).toUpperCase()

  const body = {
    nome:      params.customer?.name      || fallbackName,
    cpf:       (params.customer?.document || fakeDoc).replace(/\D/g, ''),
    valor:     params.amount.toFixed(2),
    descricao: params.description || params.items?.[0]?.title || 'Pagamento PIX',
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
    throw new Error(`PixGate API error: ${response.status}`)
  }

  const raw = await response.json()
  // Adapta resposta nova → estrutura antiga que outros arquivos esperam
  return {
    success: true,
    data: {
      id:        String(raw.id),
      status:    String(raw.status || 'PENDING'),
      amount:    Number(raw.value ?? params.amount),
      pix: {
        qrcode:         raw.pix || '',
        copyPaste:      raw.pix || '',
        expirationDate: '',   // API nova não retorna validade
      },
      createdAt: new Date().toISOString(),
    },
  }
}

// ─── Cash Out (saque PIX) ────────────────────────────────────────────

export interface CreatePixCashoutParams {
  amount: number
  beneficiaryName: string
  beneficiaryDocument: string  // CPF/CNPJ só dígitos
  description?: string
}

export async function createPixCashout(params: CreatePixCashoutParams): Promise<any> {
  const response = await fetch(`${PIXGATE_BASE_URL}/cashout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      nome:      params.beneficiaryName,
      cpf:       params.beneficiaryDocument.replace(/\D/g, ''),
      valor:     params.amount.toFixed(2),
      descricao: params.description || 'Saque',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate createPixCashout error:', response.status, err)
    throw new Error(`PixGate API error: ${response.status}`)
  }
  return response.json()
}

// ─── Endpoints que a API nova NÃO TEM ────────────────────────────────
// Mantidos por compatibilidade, mas retornam stubs. A API nova não
// permite consultar transação/saldo via HTTP — só recebe webhook quando
// um pagamento é confirmado. Pra status, consulte o banco local
// (atualizado pelo webhook).

export async function getTransaction(
  transactionId: string
): Promise<PixGateTransactionResponse> {
  console.warn(
    '[lib/pixgate] getTransaction() chamado, mas API nova do PixGate ' +
    'não tem endpoint de consulta. Use o banco local (atualizado via webhook). ' +
    'transactionId:', transactionId
  )
  return {
    success: false,
    data: {
      id:            transactionId,
      status:        'unknown',
      amount:        0,
      paymentMethod: 'pix',
      customer:      null,
      items:         [],
      pix:           null,
      createdAt:     new Date().toISOString(),
    },
  }
}

export async function listTransactions(_params?: {
  page?: number
  limit?: number
  status?: string
  type?: string
}): Promise<any> {
  console.warn(
    '[lib/pixgate] listTransactions() chamado, mas API nova do PixGate ' +
    'não tem endpoint de listagem. Use o banco local.'
  )
  return { success: false, data: [] }
}

export async function getBalance(): Promise<PixGateBalanceResponse> {
  console.warn(
    '[lib/pixgate] getBalance() chamado, mas API nova do PixGate ' +
    'não tem endpoint de saldo via HTTP. Consulte direto no painel deles.'
  )
  return {
    success: false,
    data: {
      available: 0,
      pending:   0,
      blocked:   0,
      currency:  'BRL',
    },
  }
}

// ─── Validação de webhook (placeholder) ──────────────────────────────
// A doc nova não menciona assinatura. Por segurança, valide o domínio
// de origem por outro meio (IP allowlist, secret na URL, etc).

export function validateWebhookSignature(
  _payload: any,
  _signature: string,
  _timestamp: string
): boolean {
  return true
}
