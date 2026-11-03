import { db, getSupabase } from '@/lib/ec-supabase'
import { decrypt } from '@/lib/ec-crypto'
import { MPAPI } from '@/lib/ec-mp-api'
import { isEcAdmin } from '@/lib/ec-admin'
import { entriesForPayment, type LedgerRow } from '@/lib/ec-ledger-calc'

/* ============================================================================
   Saldo dos usuários. A fonte é o Mercado Pago, não as notificações: cada venda
   vira uma linha em web_ledger, única por pagamento. Só entra venda com dono no
   site (sale:by:{ref}), então o que é gerado no exe fica de fora.
   ============================================================================ */

const OVERLAP_MS = 5 * 60_000
const MAX_PAGES = 20

export const percentKey = (u: string) => `payout:percent:${u}`
export const pixKey = (u: string) => `payout:pix:${u}`

export interface PixInfo { key: string; updatedAt: string; changed: boolean }

export function parsePix(raw: string | null | undefined): PixInfo | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    return p?.key ? { key: String(p.key), updatedAt: String(p.updatedAt || ''), changed: !!p.changed } : null
  } catch { return null }
}

async function settingsMap(keys: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const chunks: string[][] = []
  for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100))
  const results = await Promise.all(chunks.map(c => db.getSettings(c)))
  for (const rows of results) for (const r of rows) map.set(r.key, r.value)
  return map
}

export async function percentsFor(usernames: string[]): Promise<Map<string, number | null>> {
  const unique = [...new Set(usernames)]
  const stored = await settingsMap(unique.map(percentKey))
  const out = new Map<string, number | null>()
  for (const u of unique) {
    const raw = stored.get(percentKey(u))
    // O que o admin vende é todo dele: não gera saldo a pagar.
    out.set(u, isEcAdmin(u) ? 0 : raw != null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null)
  }
  return out
}

export async function pixFor(usernames: string[]): Promise<Map<string, PixInfo | null>> {
  const stored = await settingsMap(usernames.map(pixKey))
  return new Map(usernames.map(u => [u, parsePix(stored.get(pixKey(u)))]))
}

/** false enquanto o SQL de ec-repasses-migration.sql não tiver sido rodado. */
export async function ledgerReady(): Promise<boolean> {
  const { error } = await getSupabase().from('web_ledger').select('id', { head: true, count: 'exact' }).limit(1)
  return !error
}

async function insertRows(rows: LedgerRow[]) {
  if (!rows.length) return
  const { error } = await getSupabase()
    .from('web_ledger')
    .upsert(rows, { onConflict: 'mp_payment_id,entry_key', ignoreDuplicates: true })
  if (error) throw new Error(error.message)
}

async function processPayments(payments: any[], cred: any, startISO: string) {
  const sb = getSupabase()
  const approved = payments.filter(p => p.date_approved && p.external_reference)
  if (!approved.length) return

  const refs = [...new Set(approved.map(p => String(p.external_reference)))]
  const owners = await settingsMap(refs.map(r => `sale:by:${r}`))
  const mine = approved.filter(p => owners.has(`sale:by:${p.external_reference}`))
  if (!mine.length) return

  const percents = await percentsFor(mine.map(p => owners.get(`sale:by:${p.external_reference}`)!))

  const ids = mine.map(p => String(p.id))
  const titles = new Map<string, string>()
  const existing = new Map<string, any[]>()
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await sb.from('web_ledger')
      .select('mp_payment_id,entry_key,kind,gross,percent').in('mp_payment_id', ids.slice(i, i + 100))
    if (error) throw new Error(error.message)
    for (const row of data ?? []) existing.set(row.mp_payment_id, [...(existing.get(row.mp_payment_id) ?? []), row])
  }
  const mineRefs = [...new Set(mine.map(p => String(p.external_reference)))]
  for (let i = 0; i < mineRefs.length; i += 100) {
    const { data } = await sb.from('web_sales')
      .select('external_reference,title').in('external_reference', mineRefs.slice(i, i + 100))
    for (const row of data ?? []) if (row.title) titles.set(row.external_reference, row.title)
  }

  const rows: LedgerRow[] = []
  for (const p of mine) {
    const username = owners.get(`sale:by:${p.external_reference}`)!
    const created = entriesForPayment(p, {
      username,
      title: titles.get(p.external_reference) ?? null,
      slot: cred.slot,
      slotName: cred.name ?? null,
      percent: percents.get(username) ?? null,
      startISO,
      existing: existing.get(String(p.id)) ?? [],
    })
    rows.push(...created)

    // A venda deixa de contar como aprovada também nos números do Dashboard.
    if (created.some(r => r.kind === 'reversal') && ['refunded', 'charged_back'].includes(p.status)) {
      await sb.from('web_sales').update({ status: p.status, updated_at: new Date().toISOString() })
        .eq('external_reference', p.external_reference).eq('status', 'approved')
    }
  }
  await insertRows(rows)
}

/** Vendas de antes do painel: entram só nos gráficos, com o saldo começando em zero. */
async function backfillHistory(startISO: string) {
  if (await db.getSetting('ledger:backfilled')) return
  const sb = getSupabase()

  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('web_sales')
      .select('external_reference,mp_payment_id,slot,slot_name,title,amount,approved_at,updated_at,created_at')
      .eq('status', 'approved').not('mp_payment_id', 'is', null)
      .order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    const sales: any[] = data ?? []
    if (!sales.length) break

    const owners = await settingsMap(sales.map(s => `sale:by:${s.external_reference}`))
    const withOwner = sales.filter(s => owners.has(`sale:by:${s.external_reference}`))
    const percents = await percentsFor(withOwner.map(s => owners.get(`sale:by:${s.external_reference}`)!))

    await insertRows(withOwner.flatMap(s => {
      const username = owners.get(`sale:by:${s.external_reference}`)!
      return entriesForPayment({
        id: s.mp_payment_id,
        status: 'approved',
        external_reference: s.external_reference,
        transaction_amount: s.amount,
        date_approved: s.approved_at || s.updated_at || s.created_at,
      }, {
        username, title: s.title ?? null, slot: s.slot, slotName: s.slot_name ?? null,
        percent: percents.get(username) ?? null, startISO, existing: [],
      })
    }))
    if (sales.length < 1000) break
  }
  await db.setSetting('ledger:backfilled', new Date().toISOString())
}

async function syncAccount(cred: any, startISO: string) {
  const sinceKey = `ledger:sync:slot:${cred.slot}`
  const until = new Date().toISOString()
  const last = await db.getSetting(sinceKey)
  const since = new Date(Date.parse(last || startISO) - OVERLAP_MS).toISOString()

  const api = new MPAPI(await decrypt(cred.access_token))
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await api.searchPaymentsUpdated(since, until, page * 100, 100)
    const results: any[] = data?.results ?? []
    await processPayments(results, cred, startISO)
    if (results.length < 100) break
  }
  // Conta que falhou continua de onde parou quando voltar a responder.
  await db.setSetting(sinceKey, until)
}

let running: Promise<void> | null = null
let lastRun = 0

async function runSync() {
  await db.claimSetting('ledger:start', new Date().toISOString())
  const startISO = (await db.getSetting('ledger:start'))!

  await backfillHistory(startISO)

  const creds = await db.listCreds()
  await Promise.allSettled(creds.filter((c: any) => c.access_token).map(async (cred: any) => {
    const errKey = `ledger:error:slot:${cred.slot}`
    try {
      await syncAccount(cred, startISO)
      if (await db.getSetting(errKey)) await db.setSetting(errKey, '')
    } catch (e: any) {
      console.error(`[ledger slot ${cred.slot}]`, e)
      await db.setSetting(errKey, `${new Date().toISOString()} ${e?.message || e}`).catch(() => {})
    }
  }))

  // Busca pela data de aprovação: foi ela que achou as vendas de 03/11 que a busca acima
  // deixou passar. Roda em todo sync (venda aprovada entra no saldo em segundos) e, a cada
  // 10 min, olha também as últimas 48h para pegar o que aprovou perto da meia-noite.
  if (Date.now() - lastWide > 10 * 60_000) {
    lastWide = Date.now()
    await checkApproved(new Date(Math.max(Date.parse(startISO), Date.now() - 48 * 3600_000)).toISOString())
  }
  const res = await checkToday()
  if (res.groups.repaired.count) console.warn(`[ledger] ${res.groups.repaired.count} vendas gravadas pela conferência`)
  lastCheck = { ...res, checkedAt: new Date().toISOString() }
  // Guardada no banco para o painel continuar mostrando a hora certa depois de um reinício.
  await db.setSetting('ledger:lastcheck', JSON.stringify(lastCheck)).catch(() => {})
}

let lastWide = 0
let lastCheck: (DayCheck & { checkedAt: string }) | null = null

/** Resultado da última conferência do dia. */
export async function lastDayCheck() {
  if (lastCheck) return lastCheck
  try { return JSON.parse((await db.getSetting('ledger:lastcheck')) || 'null') } catch { return null }
}

export interface DayCheck {
  start: string | null
  accounts: { slot: number; name: string | null; lastSync: string | null; error: string | null; failed?: string }[]
  /** Vendas aprovadas hoje no MP, separadas pelo motivo de estarem (ou não) no saldo */
  groups: Record<'counted' | 'beforePanel' | 'admin' | 'noOwner' | 'repaired', { count: number; gross: number }>
  byUser: { username: string; count: number; gross: number }[]
}

/**
 * Confere o dia direto no Mercado Pago: cada venda aprovada hoje entrou no saldo? Se uma venda
 * com dono ficou de fora, grava agora. Mostra também por que as outras não contam.
 */
export async function checkToday(): Promise<DayCheck> {
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
  return checkApproved(`${today}T00:00:00.000-03:00`)
}

async function checkApproved(since: string): Promise<DayCheck> {
  await db.claimSetting('ledger:start', new Date().toISOString())
  const startISO = (await db.getSetting('ledger:start'))!
  const until = new Date().toISOString()

  const empty = () => ({ count: 0, gross: 0 })
  const groups: DayCheck['groups'] = { counted: empty(), beforePanel: empty(), admin: empty(), noOwner: empty(), repaired: empty() }
  const users = new Map<string, { count: number; gross: number }>()
  const add = (g: keyof DayCheck['groups'], amount: number) => { groups[g].count++; groups[g].gross = Math.round((groups[g].gross + amount) * 100) / 100 }

  const creds = (await db.listCreds()).filter((c: any) => c.access_token)
  const meta = await settingsMap(creds.flatMap((c: any) => [`ledger:sync:slot:${c.slot}`, `ledger:error:slot:${c.slot}`]))
  const accounts: DayCheck['accounts'] = creds.map((cred: any) => ({
    slot: cred.slot, name: cred.name ?? null,
    lastSync: meta.get(`ledger:sync:slot:${cred.slot}`) || null,
    error: meta.get(`ledger:error:slot:${cred.slot}`) || null,
  }))

  // Contas em paralelo: uma conta lenta não segura as outras.
  await Promise.all(creds.map(async (cred: any, i: number) => {
    const acc = accounts[i]
    try {
      const api = new MPAPI(await decrypt(cred.access_token))
      const payments: any[] = []
      for (let page = 0; page < MAX_PAGES; page++) {
        const data = await api.searchPaymentsUpdated(since, until, page * 100, 100, 'date_approved')
        const results: any[] = data?.results ?? []
        payments.push(...results.filter(p => p.date_approved))
        if (results.length < 100) break
      }
      if (!payments.length) return

      const refs = [...new Set(payments.map(p => String(p.external_reference || '')).filter(Boolean))]
      const owners = refs.length ? await settingsMap(refs.map(r => `sale:by:${r}`)) : new Map<string, string>()
      const ids = payments.map(p => String(p.id))
      const inLedger = new Map<string, boolean>()
      for (let i = 0; i < ids.length; i += 100) {
        const { data, error } = await getSupabase().from('web_ledger')
          .select('mp_payment_id,settled').eq('kind', 'sale').in('mp_payment_id', ids.slice(i, i + 100))
        if (error) throw new Error(error.message)
        for (const row of data ?? []) inLedger.set(row.mp_payment_id, !!row.settled)
      }

      const missing: any[] = []
      for (const p of payments) {
        const amount = Number(p.transaction_amount || 0)
        const owner = p.external_reference ? owners.get(`sale:by:${p.external_reference}`) : undefined
        if (!owner) { add('noOwner', amount); continue }
        if (isEcAdmin(owner)) { add('admin', amount); continue }
        const u = users.get(owner) ?? { count: 0, gross: 0 }
        u.count++; u.gross = Math.round((u.gross + amount) * 100) / 100
        users.set(owner, u)
        if (!inLedger.has(String(p.id))) { missing.push(p); add('repaired', amount) }
        else add(inLedger.get(String(p.id)) ? 'beforePanel' : 'counted', amount)
      }
      if (missing.length) await processPayments(missing, cred, startISO)
    } catch (e: any) {
      acc.failed = e?.message || String(e)
    }
  }))

  return {
    start: startISO,
    accounts,
    groups,
    byUser: [...users].map(([username, v]) => ({ username, ...v })).sort((a, b) => b.gross - a.gross),
  }
}

/** Busca no Mercado Pago o que mudou desde a última vez: vendas novas e estornos. */
export function syncLedger(minGapMs = 60_000): Promise<void> {
  // Um sync preso (MP ou banco sem responder) não pode travar todos os próximos.
  if (running && Date.now() - lastRun < 3 * 60_000) return running
  if (Date.now() - lastRun < minGapMs) return Promise.resolve()
  lastRun = Date.now()
  const mine: Promise<void> = ledgerReady()
    .then(ready => (ready ? runSync() : undefined))
    .catch(e => { console.error('[ledger sync]', e) })
    .finally(() => { if (running === mine) running = null })
  running = mine
  return running
}

/** Atualiza antes de responder, sem deixar a tela presa se o Mercado Pago estiver lento. */
export function syncLedgerBriefly(maxWaitMs = 8000): Promise<void> {
  return Promise.race([
    syncLedger(20_000),
    new Promise<void>(resolve => setTimeout(resolve, maxWaitMs)),
  ])
}

export async function loadEntries(filter: {
  fromISO?: string
  toISO?: string
  username?: string
  openOnly?: boolean
}): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    let q = getSupabase().from('web_ledger').select('*')
    if (filter.fromISO) q = q.gte('occurred_at', filter.fromISO)
    if (filter.toISO) q = q.lte('occurred_at', filter.toISO)
    if (filter.username) q = q.eq('username', filter.username)
    if (filter.openOnly) q = q.is('payout_id', null).eq('settled', false)
    const { data, error } = await q.order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}
