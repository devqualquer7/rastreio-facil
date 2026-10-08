/**
 * Pix automático via Checkout Pro.
 *
 * O servidor não tem navegador, então quem "passa" pelo checkout do Mercado Pago
 * é o app desktop: publicamos o comando `mp:auto-pix` na ponte (Pusher) e o PC
 * abre o link numa janela oculta, escolhe Pix e devolve o copia e cola.
 *
 * Se o PC estiver offline ou o checkout não colaborar, quem chama ainda tem o
 * link normal — isso aqui nunca lança erro.
 */
import Pusher from 'pusher'
import { randomUUID } from 'crypto'
import { sign } from '@/lib/bridge-hmac'
import { awaitResponse } from '@/lib/bridge-state'
import { db } from '@/lib/ec-supabase'

/** web_settings key onde o bridge-auth grava o id do último desktop conectado */
export const BRIDGE_ID_SETTING = 'bridge:desktop_id'
/** idem, para o app rodando em "modo servidor" (máquina sempre ligada) */
export const BRIDGE_SERVER_ID_SETTING = 'bridge:server_id'

const VALID_ID = /^[a-f0-9]+$/

/** Alguém está conectado nesse canal agora? Na dúvida (erro na consulta) assume que sim. */
async function isOnline(pusher: Pusher, bridgeId: string): Promise<boolean> {
  try {
    const r = await pusher.get({ path: `/channels/presence-bridge-${bridgeId}/users` })
    if (r.status !== 200) return true
    const body: any = await r.json()
    return Array.isArray(body?.users) && body.users.some((u: any) => u.id === 'desktop')
  } catch { return true }
}

export type AutoPixResult =
  /** via: qual máquina gerou — 'server' = máquina 24h (modo servidor), 'desktop' = PC de uso */
  | { ok: true; code: string; qrBase64: string; via?: 'server' | 'desktop' }
  | { ok: false; reason: 'offline' | 'captcha' | 'rejected' | 'stuck' | 'error'; message: string }

// Cada máquina tem ~40s para percorrer o checkout. Duas tentativas (máquina 24h e
// depois o PC) precisam caber nos 100s que a Cloudflare dá para a requisição.
const TIMEOUT_MS = 42_000

/** Pede o Pix a UMA máquina e espera a resposta dela. Nunca lança erro. */
async function askMachine(pusher: Pusher, bridgeId: string, link: string): Promise<AutoPixResult> {
  try {
    const id = randomUUID()
    const envelope = { id, command: 'mp:auto-pix', args: { link }, ts: Date.now() }
    const sig = sign(JSON.stringify(envelope))

    // Awaiter antes do trigger, para não perder uma resposta rápida
    const response = awaitResponse(id, TIMEOUT_MS)
    response.catch(() => {})
    await pusher.trigger('presence-bridge-' + bridgeId, 'client-command', { ...envelope, sig })

    const res = await response            // { ok: true, data: <resultado do autoPix na máquina> }
    const data = res?.data
    if (data?.ok && data.code) return { ok: true, code: data.code, qrBase64: data.qrBase64 }
    return {
      ok: false,
      reason: data?.reason || 'error',
      message: data?.message || 'A máquina não conseguiu gerar o Pix.',
    }
  } catch (e: any) {
    const msg = String(e?.message || 'Erro desconhecido')
    const offline = /offline|tempo esgotado|desconhecido/i.test(msg)
    return {
      ok: false,
      reason: offline ? 'offline' : 'error',
      message: offline ? 'A máquina com o app não respondeu (desligada ou app desatualizado).' : msg,
    }
  }
}

/**
 * Ordem: máquina 24h (modo servidor) → PC de uso → desiste (quem chamou entrega o link).
 * Só passa para a próxima se a anterior estiver offline ou falhar; uma recusa do
 * próprio Mercado Pago encerra na hora, porque a outra máquina receberia a mesma recusa.
 */
export async function requestAutoPix(link: string): Promise<AutoPixResult> {
  try {
    const appId  = process.env.PUSHER_APP_ID
    const key    = process.env.PUSHER_KEY
    const secret = process.env.PUSHER_SECRET
    if (!appId || !key || !secret || !process.env.BRIDGE_HMAC_SECRET) {
      return { ok: false, reason: 'offline', message: 'Ponte com o PC não configurada no servidor.' }
    }

    const pusher = new Pusher({ appId, key, secret, cluster: process.env.PUSHER_CLUSTER || 'sa1', useTLS: true })

    const serverId = String(await db.getSetting(BRIDGE_SERVER_ID_SETTING) || '')
    const candidates = [...new Set([
      serverId,
      process.env.BRIDGE_ID || await db.getSetting(BRIDGE_ID_SETTING),
    ].map(v => String(v || '')).filter(v => VALID_ID.test(v)))]
    if (!candidates.length) {
      return { ok: false, reason: 'offline', message: 'Nenhum PC pareado ainda — abra o app desktop atualizado.' }
    }

    let last: AutoPixResult = { ok: false, reason: 'offline', message: 'Nenhuma máquina com o app está online agora.' }
    for (const bridgeId of candidates) {
      if (!(await isOnline(pusher, bridgeId))) continue
      last = await askMachine(pusher, bridgeId, link)
      if (last.ok) return { ...last, via: bridgeId === serverId ? 'server' : 'desktop' }
      if (last.reason === 'rejected') return last
    }
    return last
  } catch (e: any) {
    return { ok: false, reason: 'error', message: String(e?.message || 'Erro desconhecido') }
  }
}
