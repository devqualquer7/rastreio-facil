const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export interface MPAccount {
  slot: number
  mp_user_id: string
  public_key: string
  access_token: string
  is_active: boolean
  connected: boolean
}

async function supabaseFetch(path: string): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required for MP accounts')
  }
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
}

export async function getActiveMPAccounts(): Promise<MPAccount[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []
  try {
    const res = await supabaseFetch(
      '/web_credentials?select=slot,mp_user_id,public_key,access_token,is_active,connected&connected=eq.true&is_active=eq.true&order=slot.asc'
    )
    if (!res.ok) {
      console.error('[checkout-mp] Supabase fetch failed:', res.status, await res.text())
      return []
    }
    return await res.json() as MPAccount[]
  } catch (e) {
    console.error('[checkout-mp] Error fetching MP accounts:', e)
    return []
  }
}

export async function getMPAccountBySlot(slot: number): Promise<MPAccount | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  try {
    const res = await supabaseFetch(
      `/web_credentials?select=slot,mp_user_id,public_key,access_token,is_active,connected&slot=eq.${slot}&limit=1`
    )
    if (!res.ok) return null
    const rows = await res.json() as MPAccount[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function getPrimaryMPAccount(): Promise<MPAccount | null> {
  const accounts = await getActiveMPAccounts()
  return accounts[0] ?? null
}

export async function mpCreatePixPreference(
  accessToken: string,
  amountCents: number,
  description?: string,
): Promise<{ preference_id: string; init_point: string; pix_code?: string }> {
  const amount = amountCents / 100
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  ]
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': ua,
      'X-Idempotency-Key': `co-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      items: [{ title: description ?? 'Pagamento', quantity: 1, currency_id: 'BRL', unit_price: amount }],
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }, { id: 'credit_card' }, { id: 'debit_card' }],
        default_payment_method_id: 'pix',
      },
      expires: true,
      expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MP preference error ${res.status}: ${err}`)
  }
  const d = await res.json()
  return { preference_id: d.id, init_point: d.init_point }
}
