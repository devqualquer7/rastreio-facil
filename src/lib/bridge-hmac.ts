/**
 * HMAC helpers for bridge messages.
 *
 * Both the mobile->desktop direction and desktop->server callback are signed
 * with the same shared secret (BRIDGE_HMAC_SECRET) to prevent forgery.
 */

import { createHmac } from 'crypto'

const SECRET = () => process.env.BRIDGE_HMAC_SECRET || ''

export function sign(payload: string): string {
  const secret = SECRET()
  if (!secret) throw new Error('BRIDGE_HMAC_SECRET não configurado.')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verify(payload: string, sig: string): boolean {
  if (!sig) return false
  const expected = sign(payload)
  if (expected.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  }
  return diff === 0
}

/** Canonicalize an object for signing — sorts keys recursively. */
export function canonicalize(obj: any): string {
  return JSON.stringify(obj, Object.keys(obj || {}).sort())
}
