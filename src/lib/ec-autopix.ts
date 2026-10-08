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

export type AutoPixResult =
  | { ok: true; code: string; qrBase64: string }
  | { ok: false; reason: 'offline' | 'captcha' | 'rejected' | 'stuck' | 'error'; message: string }

// O PC leva ~10s; damos folga para checkout lento antes de desistir
const TIMEOUT_MS = 50_000

export async function requestAutoPix(link: string): Promise<AutoPixResult> {
  try {
    const appId  = process.env.PUSHER_APP_ID
    const key    = process.env.PUSHER_KEY
    const secret = process.env.PUSHER_SECRET
    if (!appId || !key || !secret || !process.env.BRIDGE_HMAC_SECRET) {
      return { ok: false, reason: 'offline', message: 'Ponte com o PC não configurada no servidor.' }
    }

    const bridgeId = process.env.BRIDGE_ID || await db.getSetting(BRIDGE_ID_SETTING)
    if (!bridgeId || !/^[a-f0-9]+$/.test(String(bridgeId))) {
      return { ok: false, reason: 'offline', message: 'Nenhum PC pareado ainda — abra o app desktop atualizado.' }
    }

    const pusher = new Pusher({ appId, key, secret, cluster: process.env.PUSHER_CLUSTER || 'sa1', useTLS: true })
    const id = randomUUID()
    const envelope = { id, command: 'mp:auto-pix', args: { link }, ts: Date.now() }
    const sig = sign(JSON.stringify(envelope))

    // Awaiter antes do trigger, para não perder uma resposta rápida
    const response = awaitResponse(id, TIMEOUT_MS)
    response.catch(() => {})
    await pusher.trigger('presence-bridge-' + bridgeId, 'client-command', { ...envelope, sig })

    const res = await response            // { ok: true, data: <resultado do autoPix no PC> }
    const data = res?.data
    if (data?.ok && data.code) return { ok: true, code: data.code, qrBase64: data.qrBase64 }
    return {
      ok: false,
      reason: data?.reason || 'error',
      message: data?.message || 'O PC não conseguiu gerar o Pix.',
    }
  } catch (e: any) {
    const msg = String(e?.message || 'Erro desconhecido')
    const offline = /offline|tempo esgotado|desconhecido/i.test(msg)
    return {
      ok: false,
      reason: offline ? 'offline' : 'error',
      message: offline ? 'O PC com o app não respondeu (desligado ou app desatualizado).' : msg,
    }
  }
}
