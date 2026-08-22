import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Singleton — createClient is expensive; reuse across all requests in the same process
let _client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  }
  return _client
}

export const db = {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUserByUsername(username: string) {
    const sb = getSupabase()
    const { data } = await sb.from('web_users').select('*').eq('username', username).single()
    return data
  },
  async createUser(username: string, passwordHash: string, salt: string) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('web_users')
      .insert({ username, password_hash: passwordHash, salt })
      .select().single()
    if (error) throw error
    return data
  },
  async countUsers() {
    const sb = getSupabase()
    const { count } = await sb.from('web_users').select('*', { count: 'exact', head: true })
    return count ?? 0
  },
  async listUsers() {
    const sb = getSupabase()
    const { data } = await sb.from('web_users').select('id,username,created_at').order('created_at')
    return data ?? []
  },
  async deleteUser(username: string) {
    const sb = getSupabase()
    const { error } = await sb.from('web_users').delete().eq('username', username)
    if (error) throw error
  },

  // ── Credentials ────────────────────────────────────────────────────────────
  async listCreds() {
    const sb = getSupabase()
    const { data } = await sb.from('web_credentials').select('*').order('slot')
    return data ?? []
  },
  async getCredBySlot(slot: number) {
    const sb = getSupabase()
    const { data } = await sb.from('web_credentials').select('*').eq('slot', slot).single()
    return data
  },
  async getActiveCred() {
    const sb = getSupabase()
    const { data } = await sb.from('web_credentials').select('*').eq('is_active', true).single()
    return data
  },
  async getCredByMpUserId(mpUserId: string) {
    const sb = getSupabase()
    const { data } = await sb.from('web_credentials').select('*').eq('mp_user_id', mpUserId).maybeSingle()
    return data
  },
  async nextSlot() {
    const sb = getSupabase()
    const { data } = await sb
      .from('web_credentials')
      .select('slot')
      .order('slot', { ascending: false })
      .limit(1)
    return ((data?.[0]?.slot ?? 0) + 1)
  },
  async upsertCred(data: {
    slot: number
    name: string
    access_token: string
    mp_user_id?: string
    connected?: boolean
    is_active?: boolean
    health_status?: string
    health_message?: string
    last_test_at?: string
  }) {
    const sb = getSupabase()
    const { data: result, error } = await sb
      .from('web_credentials')
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: 'slot' })
      .select().single()
    if (error) throw error
    return result
  },
  async updateCred(slot: number, updates: Partial<{
    name: string
    access_token: string
    mp_user_id: string
    connected: boolean
    is_active: boolean
    health_status: string
    health_message: string
    last_test_at: string
  }>) {
    const sb = getSupabase()
    const { error } = await sb
      .from('web_credentials')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('slot', slot)
    if (error) throw error
  },
  async setAllInactive() {
    const sb = getSupabase()
    await sb.from('web_credentials').update({ is_active: false }).neq('slot', -1)
  },
  async deleteCred(slot: number) {
    const sb = getSupabase()
    const { error } = await sb.from('web_credentials').delete().eq('slot', slot)
    if (error) throw error
  },

  // ── Sales ──────────────────────────────────────────────────────────────────
  async listSales(limit = 500) {
    const sb = getSupabase()
    const { data } = await sb
      .from('web_sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  },
  async getSaleByRef(ref: string) {
    const sb = getSupabase()
    const { data } = await sb.from('web_sales').select('*').eq('external_reference', ref).single()
    return data
  },
  async getPendingSales() {
    const sb = getSupabase()
    const { data } = await sb
      .from('web_sales')
      .select('*')
      .in('status', ['gerado', 'pending', 'in_process', 'authorized'])
      .order('created_at', { ascending: false })
    return data ?? []
  },
  async upsertSale(sale: {
    external_reference: string
    mp_payment_id?: string | null
    mp_preference_id?: string | null
    slot: number
    slot_name: string
    title: string
    amount: number
    status: string
    status_detail?: string | null
    payment_type_id?: string | null
    payment_method_id?: string | null
    payer_email?: string | null
    link?: string | null
    installments?: number | null
    fee_amount?: number | null
    net_amount?: number | null
    rejection_count?: number
    auto_cancelled?: boolean
    notified?: boolean
    approved_at?: string | null
  }) {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('web_sales')
      .upsert({ ...sale, updated_at: new Date().toISOString() }, { onConflict: 'external_reference' })
      .select().single()
    if (error) throw error
    return data
  },
  /** Update a sale by its numeric primary key `id` */
  async updateSale(id: number, updates: Record<string, unknown>) {
    const sb = getSupabase()
    const { error } = await sb
      .from('web_sales')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  async getSetting(key: string) {
    const sb = getSupabase()
    const { data } = await sb.from('web_settings').select('value').eq('key', key).single()
    return data?.value
  },
  /** Returns an array of {key, value} pairs (not a Record) */
  async getSettings(keys: string[]): Promise<{ key: string; value: string }[]> {
    const sb = getSupabase()
    const { data } = await sb.from('web_settings').select('key,value').in('key', keys)
    return (data ?? []) as { key: string; value: string }[]
  },
  async setSetting(key: string, value: string) {
    const sb = getSupabase()
    await sb
      .from('web_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  },

  // ── Saque payments (KV-backed via web_settings) ───────────────────────────
  // Key pattern: saque:pay:{externalId}
  // Value: JSON { username, gateway, amount, status, created_at, paid_at? }

  async saveSaquePayment(
    externalId: string,
    data: { username: string; gateway: string; amount: number; status: string }
  ) {
    const sb = getSupabase()
    await sb
      .from('web_settings')
      .upsert(
        { key: `saque:pay:${externalId}`, value: JSON.stringify({ ...data, created_at: new Date().toISOString() }), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
  },

  async markSaquePaymentPaid(externalId: string): Promise<boolean> {
    const sb = getSupabase()
    const { data } = await sb.from('web_settings').select('value').eq('key', `saque:pay:${externalId}`).single()
    if (!data?.value) return false
    try {
      const current = JSON.parse(data.value)
      if (current.status === 'paid') return true
      await sb.from('web_settings').upsert(
        { key: `saque:pay:${externalId}`, value: JSON.stringify({ ...current, status: 'paid', paid_at: new Date().toISOString() }), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      return true
    } catch { return false }
  },

  async getSaqueStatuses(externalIds: string[]): Promise<Record<string, string>> {
    if (externalIds.length === 0) return {}
    const sb = getSupabase()
    const keys = externalIds.map(id => `saque:pay:${id}`)
    const { data } = await sb.from('web_settings').select('key,value').in('key', keys)
    const result: Record<string, string> = {}
    for (const row of (data ?? [])) {
      const id = (row as any).key.replace('saque:pay:', '')
      try { result[id] = JSON.parse((row as any).value)?.status ?? 'pending' } catch {}
    }
    return result
  },

  // ── Studio models (KV-backed via web_settings) ────────────────────────────
  // Key pattern: studio:model:{id}
  // Value: JSON { id, nome, desc, dados, criadoEm }

  async listStudioModels(): Promise<any[]> {
    const sb = getSupabase()
    const { data } = await sb
      .from('web_settings')
      .select('key,value,updated_at')
      .like('key', 'studio:model:%')
      .order('updated_at', { ascending: false })
    return (data ?? []).map((row: any) => {
      try { return JSON.parse(row.value) } catch { return null }
    }).filter(Boolean)
  },

  async saveStudioModel(id: string, model: { id: string; nome: string; desc: string; dados: unknown; criadoEm: number }) {
    const sb = getSupabase()
    await sb.from('web_settings').upsert(
      { key: `studio:model:${id}`, value: JSON.stringify(model), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  },

  async deleteStudioModel(id: string) {
    const sb = getSupabase()
    await sb.from('web_settings').delete().eq('key', `studio:model:${id}`)
  },

  // ── Logs ───────────────────────────────────────────────────────────────────
  async listLogs(limit = 200) {
    const sb = getSupabase()
    const { data } = await sb
      .from('web_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  },
}

/**
 * Standalone helper imported by route files:
 *   import { addLog } from '@/lib/ec-supabase'
 *   await addLog('info', 'message', 'optional context')
 *
 * Maps to web_logs columns:
 *   type        → level string (info / success / warn / error)
 *   description → the message
 *   slot_name   → optional context label (slot ref, route name, etc.)
 */
export async function addLog(level: string, message: string, context?: string): Promise<void> {
  try {
    const sb = getSupabase()
    await sb.from('web_logs').insert({
      type: level,
      description: message,
      ...(context != null ? { slot_name: context } : {}),
    })
  } catch (e) {
    // Never let logging failures crash the caller
    console.error('[addLog]', e)
  }
}
