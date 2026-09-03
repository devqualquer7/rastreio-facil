'use client'
import { Zap, CreditCard, Ticket, Wallet, DollarSign, Coins, Landmark } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ============================================================================
   Tradução dos dados crus do Mercado Pago → português legível.
   Porte fiel do desktop (lib/mp-translate.ts): método, cor, ícone,
   motivo de recusa e atividade de pagamentos pendentes.
   ============================================================================ */

export interface MethodInfo {
  label: string
  color: string      // hex — usado inline e pra tint
  Icon: LucideIcon
}

/**
 * PIX no MP chega como payment_type_id = 'bank_transfer' + payment_method_id = 'pix'.
 * Quem mostrava "bank_transfer" cru era o bug. Aqui sempre vira "Pix".
 */
export function getMethodInfo(methodId?: string | null, typeId?: string | null): MethodInfo {
  const t = (typeId || '').toLowerCase()
  const m = (methodId || '').toLowerCase()

  // PIX — cobre os dois jeitos que o MP manda
  if (m === 'pix' || t === 'bank_transfer' || t === 'pix')
    return { label: 'Pix', color: '#00e0c6', Icon: Zap }

  if (t === 'credit_card')  return { label: 'Crédito',   color: '#a29bfe', Icon: CreditCard }
  if (t === 'debit_card')   return { label: 'Débito',    color: '#4ea8f7', Icon: CreditCard }
  if (t === 'ticket' || m === 'bolbradesco' || m.includes('bol'))
    return { label: 'Boleto', color: '#ffc83d', Icon: Ticket }
  if (t === 'account_money' || m === 'account_money')
    return { label: 'Saldo MP', color: '#00e396', Icon: Wallet }
  if (t === 'digital_wallet') return { label: 'Carteira', color: '#a29bfe', Icon: Wallet }
  if (t === 'atm')            return { label: 'Transferência', color: '#9a9ab5', Icon: Landmark }
  if (t === 'digital_currency' || t === 'crypto_transfer')
    return { label: 'Cripto', color: '#ff8c2c', Icon: Coins }
  if (t === 'voucher_card' || t === 'prepaid_card')
    return { label: 'Pré-pago', color: '#4ea8f7', Icon: CreditCard }

  // Fallback — nunca mais mostra o código cru
  return { label: methodTypeFallback(t || m), color: '#9a9ab5', Icon: DollarSign }
}

function methodTypeFallback(raw: string): string {
  if (!raw) return 'Outro'
  const map: Record<string, string> = {
    bank_transfer: 'Pix', credit_card: 'Crédito', debit_card: 'Débito',
    account_money: 'Saldo MP', ticket: 'Boleto',
  }
  return map[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Só o rótulo (pra CSV, busca, chips simples) */
export function methodLabel(methodId?: string | null, typeId?: string | null): string {
  return getMethodInfo(methodId, typeId).label
}

/* ----------------------------------------------------------------------------
   status_detail → motivo em português. Cobre aprovações, pendências e o
   catálogo de recusas cc_rejected_* do Mercado Pago.
   ---------------------------------------------------------------------------- */
const STATUS_DETAIL: Record<string, string> = {
  accredited:                       'Pagamento aprovado e creditado',
  partially_refunded:               'Parcialmente estornado',
  // Pendentes
  pending_contingency:              'Processando pagamento — aguarde alguns minutos',
  pending_review_manual:            'Em revisão manual pelo Mercado Pago',
  pending_waiting_payment:          'Aguardando o pagamento do cliente',
  pending_waiting_transfer:         'Aguardando a transferência PIX do cliente',
  pending_challenge:                'Aguardando confirmação de segurança do cliente',
  // Recusas de cartão
  cc_rejected_bad_filled_card_number: 'Número do cartão incorreto',
  cc_rejected_bad_filled_date:        'Data de validade incorreta',
  cc_rejected_bad_filled_other:       'Dados do cartão preenchidos incorretamente',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) incorreto',
  cc_rejected_blacklist:              'Cartão recusado por segurança (lista de restrição)',
  cc_rejected_call_for_authorize:     'O banco precisa autorizar — cliente deve ligar pro emissor',
  cc_rejected_card_disabled:          'Cartão desabilitado — cliente deve ativar com o banco',
  cc_rejected_card_error:             'Erro ao processar o cartão',
  cc_rejected_duplicated_payment:     'Pagamento duplicado — já existe um igual',
  cc_rejected_high_risk:              'Recusado por prevenção a fraude (alto risco)',
  cc_rejected_insufficient_amount:    'Saldo ou limite insuficiente',
  cc_rejected_invalid_installments:   'Número de parcelas não permitido pra esse cartão',
  cc_rejected_max_attempts:           'Muitas tentativas — cliente deve tentar outro cartão',
  cc_rejected_other_reason:           'Recusado pelo banco emissor',
  cc_rejected_card_type_not_allowed:  'Tipo de cartão não aceito',
  cc_rejected_time_out:               'Tempo esgotado na autorização',
  // Recusas gerais
  rejected_high_risk:                 'Recusado por risco de fraude',
  rejected_by_bank:                   'Recusado pelo banco',
  rejected_insufficient_data:         'Recusado — dados insuficientes',
  bank_error:                         'Erro no banco emissor',
  // Cancelamentos / expiração
  expired:                            'Pagamento expirado (prazo esgotado)',
  by_collector:                       'Cancelado pelo vendedor',
  by_payer:                           'Cancelado pelo comprador',
  // Estornos
  refunded:                           'Estornado ao comprador',
}

export function translateStatusDetail(detail?: string | null): string {
  if (!detail) return '—'
  return STATUS_DETAIL[detail] || detail.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** true quando o motivo é uma recusa que vale explicar pro operador */
export function isRejection(detail?: string | null): boolean {
  if (!detail) return false
  return detail.startsWith('cc_rejected') || detail.startsWith('rejected') || detail === 'bank_error'
}

/* ----------------------------------------------------------------------------
   Atividade de um pagamento PENDENTE — o que exatamente ele está esperando.
   Usado no modal do olho pra deixar claro se é PIX aguardando ou cartão em
   processamento.
   ---------------------------------------------------------------------------- */
export interface PendingActivity {
  label: string        // rótulo curto ("PIX" / "Em processamento")
  detail: string       // frase explicativa
  color: string
}

export function pendingActivity(typeId?: string | null, methodId?: string | null, statusDetail?: string | null): PendingActivity {
  const t = (typeId || '').toLowerCase()
  const m = (methodId || '').toLowerCase()

  if (m === 'pix' || t === 'bank_transfer' || t === 'pix')
    return { label: 'PIX aguardando', color: '#00e0c6',
      detail: 'QR/código PIX gerado — o cliente ainda não pagou. Aprova sozinho assim que ele transferir.' }

  if (t === 'credit_card' || t === 'debit_card')
    return { label: 'Em processamento', color: '#a29bfe',
      detail: statusDetail === 'pending_review_manual'
        ? 'Cartão em revisão manual do Mercado Pago — pode levar alguns minutos.'
        : 'Cartão em processamento — aguardando a aprovação do banco emissor.' }

  if (t === 'ticket')
    return { label: 'Boleto emitido', color: '#ffc83d',
      detail: 'Boleto gerado — a compensação leva de 1 a 2 dias úteis após o pagamento.' }

  if (t === 'account_money')
    return { label: 'Saldo MP', color: '#00e396',
      detail: 'Aguardando a confirmação do saldo em conta Mercado Pago.' }

  return { label: 'Pendente', color: '#ffc83d',
    detail: 'Pagamento pendente — aguardando a confirmação do Mercado Pago.' }
}
