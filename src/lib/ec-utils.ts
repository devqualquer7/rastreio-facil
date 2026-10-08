import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

export function fmtDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    approved: 'APROVADO', rejected: 'RECUSADO', pending: 'PENDENTE',
    cancelled: 'CANCELADO', refunded: 'ESTORNADO', in_process: 'EM ANÁLISE',
    authorized: 'AUTORIZADO', gerado: 'GERADO'
  }
  return map[status] || status.toUpperCase()
}

export function statusColor(status: string): string {
  if (status === 'approved') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  if (status === 'rejected') return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (status === 'cancelled') return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
  if (status === 'refunded') return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
}

export function paymentMethodLabel(type: string): string {
  const map: Record<string, string> = {
    bank_transfer: 'PIX', credit_card: 'Cartão Crédito',
    debit_card: 'Cartão Débito', ticket: 'Boleto', account_money: 'Conta MP'
  }
  return map[type] || type
}

/**
 * Valor digitado → número, no padrão brasileiro: ponto é separador de MILHAR e
 * vírgula é o decimal. "6.601" → 6601 · "6.601,50" → 6601.5 · "6,60" → 6.6
 */
export const parseBRL = (s: string): number =>
  parseFloat(String(s ?? '').replace(/\./g, '').replace(',', '.'))
