// AES-GCM encryption for MP access tokens stored in Supabase

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || ''
  if (!raw) throw new Error('ENCRYPTION_KEY env var is required')
  // Accept 32-char string or 64-char hex
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) return Buffer.from(raw, 'hex')
  const buf = Buffer.from(raw)
  if (buf.length === 32) return buf
  // Derive 32 bytes from whatever was given using SHA-256
  const { createHash } = require('node:crypto')
  return createHash('sha256').update(buf).digest()
}

export async function encrypt(plaintext: string): Promise<string> {
  const { webcrypto } = require('node:crypto')
  const keyBuf = getKey()
  const cryptoKey = await webcrypto.subtle.importKey('raw', keyBuf, { name: 'AES-GCM' }, false, ['encrypt'])
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, enc.encode(plaintext))
  // Format: hex(iv):base64(ciphertext)
  const ivHex = Buffer.from(iv).toString('hex')
  const ctB64 = Buffer.from(ciphertext).toString('base64')
  return `${ivHex}:${ctB64}`
}

export async function decrypt(encrypted: string): Promise<string> {
  const { webcrypto } = require('node:crypto')
  // Graceful fallback: if it doesn't look like our ivHex:base64 format,
  // treat as a plaintext token (e.g. manually inserted APP_USR-xxx credentials)
  const colonIdx = encrypted.indexOf(':')
  if (colonIdx < 24 || colonIdx > 28) return encrypted
  const [ivHex, ctB64] = encrypted.split(':')
  if (!ivHex || !ctB64) throw new Error('Invalid encrypted format')
  const keyBuf = getKey()
  const cryptoKey = await webcrypto.subtle.importKey('raw', keyBuf, { name: 'AES-GCM' }, false, ['decrypt'])
  const iv = Buffer.from(ivHex, 'hex')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext)
  return new TextDecoder().decode(plaintext)
}
