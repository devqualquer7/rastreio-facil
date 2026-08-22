import db from './db'
import crypto from 'node:crypto'

function genId() {
  return crypto.randomBytes(12).toString('hex')
}

const migrate = (sql: string) => {
  try { db.prepare(sql).run() } catch (_) { /* column/table already exists */ }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS CheckoutUser (
    id          TEXT PRIMARY KEY,
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    is_admin    INTEGER NOT NULL DEFAULT 0,
    is_banned   INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS CheckoutKey (
    id          TEXT PRIMARY KEY,
    key_value   TEXT NOT NULL UNIQUE,
    used        INTEGER NOT NULL DEFAULT 0,
    used_by     TEXT,
    used_at     DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS CheckoutGateway (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    gateway     TEXT NOT NULL,
    credentials TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, gateway)
  );
  CREATE TABLE IF NOT EXISTS CheckoutTransaction (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    gateway     TEXT NOT NULL,
    external_id TEXT,
    amount      INTEGER NOT NULL,
    description TEXT,
    pix_code    TEXT,
    pix_base64  TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    paid_at     DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS CheckoutWithdrawal (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    gateway      TEXT NOT NULL,
    amount       INTEGER NOT NULL,
    pix_key      TEXT NOT NULL,
    pix_key_type TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    external_id  TEXT,
    response     TEXT,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

migrate('ALTER TABLE CheckoutUser ADD COLUMN note TEXT')

export const codb = {

  getUserById: (id: string) =>
    db.prepare('SELECT * FROM CheckoutUser WHERE id = ?').get(id) as any,

  getUserByUsername: (username: string) =>
    db.prepare('SELECT * FROM CheckoutUser WHERE username = ?').get(username) as any,

  getAllUsers: () =>
    db.prepare('SELECT id, username, is_admin, is_banned, created_at, updated_at FROM CheckoutUser ORDER BY created_at DESC').all() as any[],

  createUser: (data: { username: string; password: string; is_admin?: number }) => {
    const id = genId()
    db.prepare(
      'INSERT INTO CheckoutUser (id, username, password, is_admin) VALUES (?, ?, ?, ?)'
    ).run(id, data.username.toLowerCase().trim(), data.password, data.is_admin ?? 0)
    return { id, username: data.username }
  },

  updateUser: (id: string, data: Partial<{ is_banned: number; is_admin: number; password: string; note: string }>) => {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ')
    const vals = Object.values(data)
    if (sets.length === 0) return
    db.prepare(`UPDATE CheckoutUser SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...vals, id)
  },

  deleteUser: (id: string) =>
    db.prepare('DELETE FROM CheckoutUser WHERE id = ?').run(id),

  countAdmins: () =>
    (db.prepare('SELECT COUNT(*) as n FROM CheckoutUser WHERE is_admin = 1').get() as any).n as number,

  getKeyByValue: (keyValue: string) =>
    db.prepare('SELECT * FROM CheckoutKey WHERE key_value = ?').get(keyValue) as any,

  getAllKeys: () =>
    db.prepare('SELECT * FROM CheckoutKey ORDER BY created_at DESC').all() as any[],

  createKey: (keyValue: string) => {
    const id = genId()
    db.prepare('INSERT INTO CheckoutKey (id, key_value) VALUES (?, ?)').run(id, keyValue)
    return { id, key_value: keyValue }
  },

  markKeyUsed: (id: string, userId: string) =>
    db.prepare(
      "UPDATE CheckoutKey SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(userId, id),

  deleteKey: (id: string) =>
    db.prepare('DELETE FROM CheckoutKey WHERE id = ?').run(id),

  getGatewaysByUser: (userId: string) =>
    db.prepare('SELECT * FROM CheckoutGateway WHERE user_id = ? ORDER BY gateway ASC').all(userId) as any[],

  getGateway: (userId: string, gateway: string) =>
    db.prepare('SELECT * FROM CheckoutGateway WHERE user_id = ? AND gateway = ?').get(userId, gateway) as any,

  upsertGateway: (userId: string, gateway: string, credentials: string) => {
    const existing = db.prepare('SELECT id FROM CheckoutGateway WHERE user_id = ? AND gateway = ?').get(userId, gateway) as any
    if (existing) {
      db.prepare(
        'UPDATE CheckoutGateway SET credentials = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(credentials, existing.id)
      return existing.id
    }
    const id = genId()
    db.prepare(
      'INSERT INTO CheckoutGateway (id, user_id, gateway, credentials) VALUES (?, ?, ?, ?)'
    ).run(id, userId, gateway, credentials)
    return id
  },

  deleteGateway: (userId: string, gateway: string) =>
    db.prepare('DELETE FROM CheckoutGateway WHERE user_id = ? AND gateway = ?').run(userId, gateway),

  getTransactionsByUser: (userId: string, limit = 100) =>
    db.prepare(
      'SELECT * FROM CheckoutTransaction WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit) as any[],

  getTransactionById: (id: string) =>
    db.prepare('SELECT * FROM CheckoutTransaction WHERE id = ?').get(id) as any,

  getTransactionByExternalId: (externalId: string) =>
    db.prepare('SELECT * FROM CheckoutTransaction WHERE external_id = ?').get(externalId) as any,

  createTransaction: (data: {
    user_id: string
    gateway: string
    external_id?: string
    amount: number
    description?: string
    pix_code?: string
    pix_base64?: string
  }) => {
    const id = genId()
    db.prepare(
      `INSERT INTO CheckoutTransaction
        (id, user_id, gateway, external_id, amount, description, pix_code, pix_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.user_id, data.gateway, data.external_id ?? null, data.amount,
      data.description ?? null, data.pix_code ?? null, data.pix_base64 ?? null,
    )
    return { id, ...data }
  },

  markTransactionPaid: (id: string) =>
    db.prepare(
      "UPDATE CheckoutTransaction SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id),

  markTransactionPaidByExternalId: (externalId: string) =>
    db.prepare(
      "UPDATE CheckoutTransaction SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?"
    ).run(externalId),

  updateTransactionStatus: (id: string, status: string) =>
    db.prepare(
      'UPDATE CheckoutTransaction SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, id),

  getWithdrawalsByUser: (userId: string, limit = 100) =>
    db.prepare(
      'SELECT * FROM CheckoutWithdrawal WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit) as any[],

  createWithdrawal: (data: {
    user_id: string; gateway: string; amount: number; pix_key: string;
    pix_key_type: string; external_id?: string; response?: string; status?: string;
  }) => {
    const id = genId()
    db.prepare(
      `INSERT INTO CheckoutWithdrawal
        (id, user_id, gateway, amount, pix_key, pix_key_type, external_id, response, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, data.user_id, data.gateway, data.amount, data.pix_key, data.pix_key_type,
      data.external_id ?? null, data.response ?? null, data.status ?? 'pending',
    )
    return { id, ...data }
  },

  updateWithdrawalStatus: (id: string, status: string, response?: string) => {
    db.prepare(
      'UPDATE CheckoutWithdrawal SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, response ?? null, id)
  },
}
