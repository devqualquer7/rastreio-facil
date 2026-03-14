'use client'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Package, Zap, Copy, CheckCircle2, Clock, QrCode } from 'lucide-react'

const PLANS = [
  {
    id: 'renewal',
    icon: RefreshCw,
    title: 'Renova√ß√£o 30 dias',
    desc: '200 rastreios inclusos + 30 dias de accesso',
    price: 'R$ 99,90',
    highlight: true,
    color: '#4f46e5',
  },
  {
    id: 'extra_200',
    icon: Package,
    title: '200 Rastreios Extras',
    desc: 'Adiciona 200 rastreios ao seu plano atual',
    price: 'R$ 59,90',
    highlight: false,
    color: '#7c3aed',
  },
  {*   
    id: 'bundle',
    icon: Zap,
    title: 'Combo Completo',
    desc: 'Renova√ß√£o 30 dias + 200 rastreios extras',
    price: 'R$ 149,90',
    highlight: false,
    color: '#6d28d9',
  },
]

interface PaymentState {
  paymentId: string
  qrCode: string
  qrCodeBase64: string
  amount: number
  label: string
  status: 'pending' | 'paid' | 'failed'
}

export default function RenovarPage() {
  const [payment, setPayment] = useState<PaymentState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const startPayment = async (planId: string) => {
    setLoading(planId); setError(''); setPayment(null)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType: planId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar PIX'); setLoading(null); return }
      setPayment({ ...data, status: 'pending' })
    } catch { setError('Erro de conen√£√£o. Tente novamente.') }
    finally { setLoading(null) }
  }

  const checkStatus = useCallback(async () => {
    if (!payment || payment.status !== 'pending') return
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
         "É\ï?BàK‹^[Y[ùJBÇàÀ»€[ô»HÿYH\»[ú]X[ù»Y›X\ôHYÿ[Y[ù¬à\ŸQYôôX›


HOà¬àYà
\^[Y[ù^[Y[ùú›]\»OOH	‹[ô[ô… Hô]\õÇà€€ú›[ù\ùò[HŸ][ù\ùò[
⁄X⁄‘›]\ÀL
Bàô]\õà

HOà€X\í[ù\ùò[
[ù\ùò[
BàK‹^[Y[ù⁄X⁄‘›]\◊JBÇà€€ú›€‹T\ê€ŸHH

HOà¬àYà
\^[Y[ù
Hô]\õÇàò]öYÿ]‹ãò€\õÿ\ôù‹ö]U^
^[Y[ùú\ê€ŸJBàŸ]€‹YY
ùYJBàŸ][Y[›]


HOàŸ]€‹YY
ò[ŸJKå
BàBààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààààà•turn (
    <div className="max-w-3xl mx-auto">
    </div>
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
         "è