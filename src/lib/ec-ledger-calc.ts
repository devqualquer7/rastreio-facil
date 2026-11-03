/* Contas do saldo e do resumo, sem acesso a banco. Horário sempre de Brasília (-03:00). */

const SP_OFFSET_MS = 3 * 3600_000

export const r2 = (n: number) => Math.round(n * 100) / 100
const cents = (n: number) => Math.round(n * 100)

export function shareOf(gross: number, percent: number | null): number {
  if (percent == null) return 0
  return (Math.sign(gross) * Math.round(Math.abs(gross) * percent)) / 100
}

export function spDay(when: string | number): string {
  const t = typeof when === 'number' ? when : Date.parse(when)
  return new Date(t - SP_OFFSET_MS).toISOString().slice(0, 10)
}

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10)
}

export interface LedgerRange { fromISO: string; toISO: string; fromDay: string; toDay: string; groupBy: 'day' | 'month' }

function rangeOf(fromDay: string, toDay: string): LedgerRange {
  const days = (Date.parse(toDay) - Date.parse(fromDay)) / 86400_000
  return {
    fromISO: `${fromDay}T00:00:00.000-03:00`,
    toISO: `${toDay}T23:59:59.999-03:00`,
    fromDay, toDay,
    groupBy: days > 62 ? 'month' : 'day',
  }
}

export function periodRange(period: string, from?: string | null, to?: string | null, now = Date.now()): LedgerRange {
  const today = spDay(now)
  const isDay = (s?: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
  switch (period) {
    case 'week': {
      const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
      return rangeOf(addDays(today, -((weekday + 6) % 7)), today)
    }
    case 'month': return rangeOf(`${today.slice(0, 7)}-01`, today)
    case 'year':  return rangeOf(`${today.slice(0, 4)}-01-01`, today)
    case 'custom':
      if (isDay(from) && isDay(to) && from <= to) return rangeOf(from, to)
      return rangeOf(today, today)
    default: return rangeOf(today, today)
  }
}

export interface LedgerRow {
  mp_payment_id: string
  entry_key: string
  username: string
  external_reference: string | null
  slot: number | null
  slot_name: string | null
  title: string | null
  kind: 'sale' | 'reversal'
  gross: number
  percent: number | null
  user_share: number
  settled: boolean
  occurred_at: string
}

/**
 * Linhas que faltam gravar para um pagamento do Mercado Pago. Estorno é uma linha negativa;
 * a chave leva o total anterior e o novo, então repetir a conta não duplica nada.
 */
export function entriesForPayment(p: any, ctx: {
  username: string
  title: string | null
  slot: number
  slotName: string | null
  /** % atual do usuário, usada se a venda ainda não tiver linha */
  percent: number | null
  /** Vendas aprovadas antes desta data não entram no saldo */
  startISO: string
  existing: { entry_key: string; kind: string; gross: number; percent: number | null }[]
}): LedgerRow[] {
  if (!p?.id || !p.date_approved) return []

  const gross = r2(Number(p.transaction_amount || 0))
  const base = {
    mp_payment_id: String(p.id),
    username: ctx.username,
    external_reference: p.external_reference || null,
    slot: ctx.slot,
    slot_name: ctx.slotName,
    title: ctx.title || p.description || p.external_reference || null,
  }
  const rows: LedgerRow[] = []

  const sale = ctx.existing.find(e => e.kind === 'sale')
  const percent = sale ? sale.percent : ctx.percent
  if (!sale) {
    rows.push({
      ...base,
      entry_key: 'sale',
      kind: 'sale',
      gross,
      percent,
      user_share: shareOf(gross, percent),
      settled: Date.parse(p.date_approved) < Date.parse(ctx.startISO),
      occurred_at: p.date_approved,
    })
  }

  // Chargeback coberto pelo Mercado Pago ("reimbursed") não sai do bolso de ninguém.
  let reversed = Number(p.transaction_amount_refunded || 0)
  if (p.status === 'refunded' || p.status === 'cancelled') reversed = gross
  if (p.status === 'charged_back') reversed = p.status_detail === 'reimbursed' ? 0 : gross

  const already = ctx.existing
    .filter(e => e.kind === 'reversal')
    .reduce((sum, e) => sum - cents(Number(e.gross)), 0)
  const target = cents(reversed)

  if (target !== already) {
    const delta = -(target - already) / 100
    rows.push({
      ...base,
      entry_key: `adj:${target}:${already}`,
      kind: 'reversal',
      gross: delta,
      percent,
      user_share: shareOf(delta, percent),
      settled: false,
      occurred_at: p.date_last_updated || new Date().toISOString(),
    })
  }
  return rows
}

export interface SummaryUser { username: string; gross: number; sales: number; refunds: number; userShare: number; myShare: number }

export interface LedgerSummary {
  gross: number
  refunds: number
  sales: number
  userShare: number
  myShare: number
  /** Linhas sem % configurada: a parte de quem ficou incompleta */
  missingPercent: number
  ranking: SummaryUser[]
  series: { key: string; gross: number; myShare: number }[]
}

export function summarize(
  entries: { username: string; kind: string; gross: number; user_share: number; percent: number | null; occurred_at: string }[],
  range: LedgerRange,
): LedgerSummary {
  const users = new Map<string, SummaryUser>()
  const buckets = new Map<string, { gross: number; myShare: number }>()

  // Períodos sem venda também aparecem no gráfico.
  for (let day = range.fromDay; day <= range.toDay; day = addDays(day, 1)) {
    buckets.set(range.groupBy === 'month' ? day.slice(0, 7) : day, { gross: 0, myShare: 0 })
  }

  const out = { gross: 0, refunds: 0, sales: 0, userShare: 0, missingPercent: 0 }
  for (const e of entries) {
    const gross = Number(e.gross)
    const share = Number(e.user_share)
    const u = users.get(e.username) ?? { username: e.username, gross: 0, sales: 0, refunds: 0, userShare: 0, myShare: 0 }

    u.gross += gross
    u.userShare += share
    out.gross += gross
    out.userShare += share
    if (e.kind === 'sale') { u.sales++; out.sales++ } else { u.refunds += gross; out.refunds += gross }
    if (e.percent == null) out.missingPercent++
    users.set(e.username, u)

    const day = spDay(e.occurred_at)
    const b = buckets.get(range.groupBy === 'month' ? day.slice(0, 7) : day)
    if (b) { b.gross += gross; b.myShare += gross - share }
  }

  const ranking = [...users.values()]
    .map(u => ({ ...u, gross: r2(u.gross), refunds: r2(u.refunds), userShare: r2(u.userShare), myShare: r2(u.gross - u.userShare) }))
    .sort((a, b) => b.gross - a.gross)

  return {
    gross: r2(out.gross),
    refunds: r2(out.refunds),
    sales: out.sales,
    userShare: r2(out.userShare),
    myShare: r2(out.gross - out.userShare),
    missingPercent: out.missingPercent,
    ranking,
    series: [...buckets].map(([key, b]) => ({ key, gross: r2(b.gross), myShare: r2(b.myShare) })),
  }
}
