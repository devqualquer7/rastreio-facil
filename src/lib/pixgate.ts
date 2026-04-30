const PIXGATE_BASE_URL = 'https://api.pixgateip.com/api'

function getHeaders() {
  const publicKey = process.env.PIXGATE_PUBLIC_KEY
  const secretKey = process.env.PIXGATE_SECRET_KEY
  if (!publicKey || !secretKey) {
    throw new Error('PIXGATE_PUBLIC_KEY and PIXGATE_SECRET_KEY env vars are required')
  }
  return {
    'X-API-Public-Key': publicKey,
    'X-API-Secret-Key': secretKey,
    'Content-Type': 'application/json',
  }
}

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
  sellerExternalRef: string
  customer: PixGateCustomer
  items: PixGateItem[]
  postbackUrl: string
  metadata?: Record<string, any>
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

export async function createPixPayment(params: CreatePixPaymentParams): Promise<PixGatePaymentResponse> {
  const response = await fetch(`${PIXGATE_BASE_URL}/payments/pix`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate createPixPayment error:', err)
    throw new Error(`PixGate API error: ${response.status}`)
  }

  return response.json()
}

export async function getTransaction(transactionId: string): Promise<PixGateTransactionResponse> {
  const response = await fetch(`${PIXGATE_BASE_URL}/payments/transactions/${transactionId}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate getTransaction error:', err)
    throw new Error(`PixGate API error: ${response.status}`)
  }

  return response.json()
}

export async function listTransactions(params) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.type) searchParams.set('type', params.type)

  const url = `${PIXGATE_BASE_URL}/payments/transactions?${searchParams.toString()}`
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate listTransactions error:', err)
    throw new Error(`PixGate API error: ${response.status}`)
  }

  return response.json()
}

export async function getBalance(): Promise<PixGateBalanceResponse> {
  const response = await fetch(`${PIXGATE_BASE_URL}/payments/balance`, {
    method: 'GET',
    headers: getHeaders(),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('PixGate getBalance error:', err)
    throw new Error(`PixGate API error: ${response.status}`)
  }

  return response.json()
}

export function validateWebhookSignature(payload, signature, timestamp) {
  const crypto = require('crypto')
  const secret = process.env.PIXGATE_SECRET_KEY
  if (!secret) return false

  const message = `${timestamp}.${JSON.stringify(payload)}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex')

  return `v1=${expectedSignature}` === signature
}
