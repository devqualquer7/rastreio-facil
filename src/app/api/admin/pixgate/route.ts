import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { query } from '@/lib/db'
import { createPixPayment, getBalance, listTransactions } from '@/lib/pixgate'

// GET - list PixGate transactions and balance
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.adminId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'balance') {
      const balance = await getBalance()
      return NextResponse.json(balance)
    }

    if (action === 'transactions') {
      const page = Number(searchParams.get('page') || '1')
      const limit = Number(searchParams.get('limit') || '20')
      const status = searchParams.get('status') || undefined
      const transactions = await listTransactions({ page, limit, status })
      return NextResponse.json(transactions)
    }

    // Default: return local payments from DB
    const payments = query.getAllPayments()
    return NextResponse.json({ payments })

  } catch (error) {
    console.error('PixGate admin GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - create a PixGate payment for a user
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.adminId) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const { userId, planType, customerName, customerEmail, customerPhone, customerDocument } = await request.json()

    if (!userId || !planType) {
      return NextResponse.json({ error: 'userId e planType sao obrigatorios' }, { status: 400 })
    }

    const PLANS: Record<string, { label: string; amount: number; daysToAdd: number; extraTrackings: number }> = {
      renewal: {
        label: 'Renovacao 30 dias',
        amount: 9990,
        daysToAdd: 30,
        extraTrackings: 200,
      },
      extra_200: {
        label: '200 Rastreios Extras',
        amount: 5990,
        daysToAdd: 0,
        extraTrackings: 200,
      },
      bundle: {
        label: 'Renovacao + 400 Extras',
        amount: 14990,
        daysToAdd: 30,
        extraTrackings: 400,
      },
    }

    const plan = PLANS[planType]
    if (!plan) {
      return NextResponse.json({ error: 'Plano invalido' }, { status: 400 })
    }

    const user = query.getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    const PIXGATE_PUBLIC_KEY = process.env.PIXGATE_PUBLIC_KEY
    if (!PIXGATE_PUBLIC_KEY) {
      return NextResponse.json({ error: 'PixGate nao configurado' }, { status: 503 })
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.rastreiofacil.com'}/api/webhooks/pixgateip`

    const name = customerName || user.username || 'Cliente'
    const email = customerEmail || user.email || 'cliente@rastreiofacil.com'
    const phone = customerPhone || '11999999999'
    const document = customerDocument || '00000000000'

    const pixData = await createPixPayment({
      amount: plan.amount,
      sellerExternalRef: `RF-${userId}-${Date.now()}`,
      customer: {
        name,
        email,
        phone,
        documentType: 'CPF',
        document,
      },
      items: [{
        title: plan.label,
        quantity: 1,
        amount: plan.amount,
        tangible: false,
      }],
      postbackUrl: webhookUrl,
      metadata: {
        userId,
        planType,
        source: 'rastreio-facil-admin',
      },
    })

    // Save payment to local DB
    const payment = query.createPayment({
      userId,
      type: planType,
      amount: plan.amount,
      pushinpayId: String(pixData.data.id),
      qrCode: pixData.data.pix.copyPaste,
      qrCodeBase64: pixData.data.pix.qrcode,
      extraTrackings: plan.extraTrackings,
      daysToAdd: plan.daysToAdd,
    })

    return NextResponse.json({
      paymentId: payment.id,
      qrCode: pixData.data.pix.copyPaste,
      qrCodeBase64: pixData.data.pix.qrcode,
      amount: plan.amount,
      label: plan.label,
      pixgateId: pixData.data.id,
    })

  } catch (error) {
    console.error('PixGate admin POST error:', error)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
