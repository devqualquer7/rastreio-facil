import { db } from '@/lib/ec-supabase'

/* ============================================================================
   Pushover — notificação no celular, POR USUÁRIO.
   Cada usuário guarda as próprias credenciais em web_settings:
     key = `pushover:{username}`  value = JSON PushoverConfig
   Só recebe push das próprias vendas (o poll resolve o dono pelo sale:by:{ref}).
   ============================================================================ */

export type PushEvent = 'approved' | 'rejected' | 'cancelled'

export interface PushoverConfig {
  enabled: boolean
  userKey: string
  apiToken: string
  events: Record<PushEvent, boolean>
  sounds: Record<PushEvent, string>
}

const DEFAULT_CONFIG: PushoverConfig = {
  enabled: false,
  userKey: '',
  apiToken: '',
  events: { approved: true, rejected: true, cancelled: true },
  sounds: { approved: 'cashregister', rejected: 'pushover', cancelled: 'pushover' },
}

// Sons disponíveis no Pushover (value = id da API, label pro dropdown)
export const PUSHOVER_SOUNDS: { value: string; label: string }[] = [
  { value: 'pushover',     label: 'Pushover (padrão)' },
  { value: 'cashregister', label: 'Caixa registradora 💰' },
  { value: 'magic',        label: 'Mágico ✨' },
  { value: 'cosmic',       label: 'Cósmico 🌌' },
  { value: 'bugle',        label: 'Corneta 🎺' },
  { value: 'gamelan',      label: 'Gamelan 🔔' },
  { value: 'incoming',     label: 'Chegando 📲' },
  { value: 'intermission', label: 'Intervalo' },
  { value: 'mechanical',   label: 'Mecânico ⚙️' },
  { value: 'siren',        label: 'Sirene 🚨' },
  { value: 'spacealarm',   label: 'Alarme espacial 🛸' },
  { value: 'updown',       label: 'Sobe-desce' },
  { value: 'none',         label: 'Silencioso 🔕' },
]

function keyFor(username: string) { return `pushover:${username}` }

export async function getPushoverConfig(username: string): Promise<PushoverConfig> {
  try {
    const raw = await db.getSetting(keyFor(username))
    if (!raw) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(raw)
    return {
      enabled: !!parsed.enabled,
      userKey: parsed.userKey || '',
      apiToken: parsed.apiToken || '',
      events: { ...DEFAULT_CONFIG.events, ...(parsed.events || {}) },
      sounds: { ...DEFAULT_CONFIG.sounds, ...(parsed.sounds || {}) },
    }
  } catch { return { ...DEFAULT_CONFIG } }
}

export async function savePushoverConfig(username: string, cfg: Partial<PushoverConfig>): Promise<PushoverConfig> {
  const current = await getPushoverConfig(username)
  const merged: PushoverConfig = {
    enabled: cfg.enabled ?? current.enabled,
    userKey: (cfg.userKey ?? current.userKey).trim(),
    apiToken: (cfg.apiToken ?? current.apiToken).trim(),
    events: { ...current.events, ...(cfg.events || {}) },
    sounds: { ...current.sounds, ...(cfg.sounds || {}) },
  }
  await db.setSetting(keyFor(username), JSON.stringify(merged))
  return merged
}

/** Envia direto com credenciais explícitas (usado no botão de teste). */
export async function sendPushoverRaw(
  userKey: string, apiToken: string,
  opts: { title: string; message: string; sound?: string; priority?: number }
): Promise<{ ok: boolean; error?: string }> {
  if (!userKey || !apiToken) return { ok: false, error: 'Credenciais Pushover ausentes' }
  try {
    const body = new URLSearchParams({
      token: apiToken,
      user: userKey,
      title: opts.title,
      message: opts.message,
      ...(opts.sound ? { sound: opts.sound } : {}),
      ...(opts.priority != null ? { priority: String(opts.priority) } : {}),
    })
    const r = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const d = await r.json().catch(() => ({}))
    if (r.ok && d.status === 1) return { ok: true }
    return { ok: false, error: (d.errors && d.errors.join(', ')) || `HTTP ${r.status}` }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Falha de rede' }
  }
}

/**
 * Envia push pra um USUÁRIO respeitando a config dele (enabled + evento ligado).
 * Retorna silencioso se o usuário não tem Pushover ou desligou o evento.
 */
export async function sendPushoverToUser(
  username: string | null | undefined,
  event: PushEvent,
  opts: { title: string; message: string }
): Promise<void> {
  if (!username) return
  try {
    const cfg = await getPushoverConfig(username)
    if (!cfg.enabled || !cfg.userKey || !cfg.apiToken) return
    if (!cfg.events[event]) return
    await sendPushoverRaw(cfg.userKey, cfg.apiToken, {
      title: opts.title,
      message: opts.message,
      sound: cfg.sounds[event],
      priority: event === 'approved' ? 1 : 0,
    })
  } catch { /* nunca deixa a notificação derrubar o poll */ }
}
