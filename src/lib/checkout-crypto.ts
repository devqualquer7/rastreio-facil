import crypto from 'node:crypto'

const raw = process.env.CHECKOUT_CRYPTO_KEY || process.env.SESSION_SECRET || ''
const KEY = crypto.createHash('sha256').update(raw).digest()

const ALG = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

export function encryptCredentials(data: Record<string, string>): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALG, KEY, iv)
  const plain = Buffer.from(JSON.stringify(data), 'utf8')
  const ct = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, ct, tag].map(b => b.toString('base64url')).join('.')
}

export function decryptCredentials(cipher: string): Record<string, string> | null {
  try {
    const parts = cipher.split('.')
    if (parts.length !== 3) return null
    const [ivB64, ctB64, tagB64] = parts
    const iv = Buffer.from(ivB64, 'base64url')
    const ct = Buffer.from(ctB64, 'base64url')
    const tag = Buffer.from(tagB64, 'base64url')
    const dec = crypto.createDecipheriv(ALG, KEY, iv)
    dec.setAuthTag(tag)
    const plain = Buffer.concat([dec.update(ct), dec.final()])
    return JSON.parse(plain.toString('utf8'))
  } catch {
    return null
  }
}
