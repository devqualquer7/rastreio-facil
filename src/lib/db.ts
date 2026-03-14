import Database from 'better-sqlite3'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || join(process.cwd(), 'prisma/dev.db')

let _db: Database.Database | null = null

function db() {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    // Ensure SaaS tables exist (Prisma schema only has Admin/Client/TrackingCode/TrackingEvent)
    _db.exec(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        registrationKeyId TEXT,
        expiresAt TEXT,
        trackingCodesUsed INTEGER DEFAULT 0,
        trackingCodesLimit INTEGER DEFAULT 50,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS RegistrationKey (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        used INTEGER DEFAULT 0,
        usedBy TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS Payment (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        pushinpayId TEXT,
        status TEXT DEFAULT 'pending',
        qrCode TEXT,
        qrCodeBase64 TEXT,
        extraTrackings INTEGER DEFAULT 0,
        daysToAdd INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }
  return _db
}

export const query = {
  // ── Clients ───────────────────────────────────────────────────────────────
  getClients: () => {
    return db().prepare('SELECT * FROM Client ORDER BY createdAt DESC').all()
  },

  getClientById: (id: string) => {
    return db().prepare('SELECT * FROM Client WHERE id = ?').get(id)
  },

  createClient: (data: { name: string; email?: string; phone?: string }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO Client (id, name, email, phone, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.email || null, data.phone || null, now, now)
    return db().prepare('SELECT * FROM Client WHERE id = ?').get(id)
  },

  deleteClient: (id: string) => {
    return db().prepare('DELETE FROM Client WHERE id = ?').run(id)
  },

  // ── Tracking Codes ────────────────────────────────────────────────────────
  getTrackingCodes: () => {
    const codes = db().prepare(
      'SELECT tc.*, c.name as clientName FROM TrackingCode tc LEFT JOIN Client c ON tc.clientId = c.id ORDER BY tc.createdAt DESC'
    ).all() as any[]
    return codes.map(tc => ({
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: query.getEventsByCodeId(tc.id)
    }))
  },

  getTrackingCodesByUserId: (userId: string) => {
    const codes = db().prepare(
      'SELECT tc.*, c.name as clientName FROM TrackingCode tc LEFT JOIN Client c ON tc.clientId = c.id ORDER BY tc.createdAt DESC'
    ).all() as any[]
    return codes.map(tc => ({
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: query.getEventsByCodeId(tc.id)
    }))
  },

  getTrackingCodeByCode: (code: string) => {
    const tc = db().prepare(
      'SELECT tc.*, c.name as clientName FROM TrackingCode tc LEFT JOIN Client c ON tc.clientId = c.id WHERE tc.code = ?'
    ).get(code) as any
    if (!tc) return null
    return {
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: query.getEventsByCodeId(tc.id)
    }
  },

  getTrackingCodeById: (id: string) => {
    const tc = db().prepare(
      'SELECT tc.*, c.name as clientName FROM TrackingCode tc LEFT JOIN Client c ON tc.clientId = c.id WHERE tc.id = ?'
    ).get(id) as any
    if (!tc) return null
    return {
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: query.getEventsByCodeId(tc.id)
    }
  },

  createTrackingCode: (data: { code: string; clientId?: string | null }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO TrackingCode (id, code, clientId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.code, data.clientId || null, now, now)
    return db().prepare('SELECT * FROM TrackingCode WHERE id = ?').get(id)
  },

  updateTrackingCode: (id: string, data: { clientId?: string | null }) => {
    const now = new Date().toISOString()
    db().prepare('UPDATE TrackingCode SET clientId = ?, updatedAt = ? WHERE id = ?')
      .run(data.clientId || null, now, id)
    return db().prepare('SELECT * FROM TrackingCode WHERE id = ?').get(id)
  },

  deleteTrackingCode: (id: string) => {
    return db().prepare('DELETE FROM TrackingCode WHERE id = ?').run(id)
  },

  // ── Tracking Events ───────────────────────────────────────────────────────
  getEventsByCodeId: (trackingCodeId: string) => {
    return db().prepare(
      'SELECT * FROM TrackingEvent WHERE trackingCodeId = ? ORDER BY date DESC'
    ).all(trackingCodeId)
  },

  createTrackingEvent: (data: { status: string; location?: string | null; date?: string; trackingCodeId: string }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO TrackingEvent (id, status, location, date, trackingCodeId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.status, data.location || null, data.date || now, data.trackingCodeId, now, now)
    return db().prepare('SELECT * FROM TrackingEvent WHERE id = ?').get(id)
  },

  deleteTrackingEvent: (id: string) => {
    return db().prepare('DELETE FROM TrackingEvent WHERE id = ?').run(id)
  },

  // ── Users (SaaS subscribers) ──────────────────────────────────────────────
  getUserById: (id: string) => {
    return db().prepare('SELECT * FROM User WHERE id = ?').get(id)
  },

  getUserByUsername: (username: string) => {
    return db().prepare('SELECT * FROM User WHERE username = ?').get(username)
  },

  getAllUsers: () => {
    return db().prepare('SELECT * FROM User ORDER BY createdAt DESC').all()
  },

  createUser: (data: { username: string; email: string; password: string; registrationKeyId?: string; expiresAt?: string }) => {
    const id = randomUUID()
    db().prepare(
      'INSERT INTO User (id, username, email, password, registrationKeyId, expiresAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.username, data.email, data.password, data.registrationKeyId || null, data.expiresAt || null)
    return db().prepare('SELECT * FROM User WHERE id = ?').get(id)
  },

  updateUser: (id: string, fields: Record<string, any>) => {
    const keys = Object.keys(fields)
    if (keys.length === 0) return
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const values = keys.map(k => fields[k])
    db().prepare(`UPDATE User SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...values, id)
    return db().prepare('SELECT * FROM User WHERE id = ?').get(id)
  },

  incrementTrackingUsed: (userId: string) => {
    db().prepare('UPDATE User SET trackingCodesUsed = trackingCodesUsed + 1 WHERE id = ?').run(userId)
  },

  addDaysToUser: (userId: string, days: number) => {
    db().prepare(`UPDATE User SET expiresAt = datetime(COALESCE(expiresAt, datetime('now')), '+${days} days') WHERE id = ?`).run(userId)
  },

  addTrackingsToUser: (userId: string, count: number) => {
    db().prepare('UPDATE User SET trackingCodesLimit = trackingCodesLimit + ? WHERE id = ?').run(count, userId)
  },

  // ── Registration Keys ─────────────────────────────────────────────────────
  getKeyByValue: (key: string) => {
    return db().prepare('SELECT * FROM RegistrationKey WHERE key = ?').get(key)
  },

  getAllKeys: () => {
    return db().prepare('SELECT * FROM RegistrationKey ORDER BY createdAt DESC').all()
  },

  createKey: (key: string) => {
    const id = randomUUID()
    db().prepare('INSERT INTO RegistrationKey (id, key) VALUES (?, ?)').run(id, key)
    return db().prepare('SELECT * FROM RegistrationKey WHERE id = ?').get(id)
  },

  markKeyUsed: (id: string, usedBy: string) => {
    db().prepare('UPDATE RegistrationKey SET used = 1, usedBy = ? WHERE id = ?').run(usedBy, id)
  },

  deleteKey: (id: string) => {
    return db().prepare('DELETE FROM RegistrationKey WHERE id = ?').run(id)
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  createPayment: (data: { userId: string; type: string; amount: number; pushinpayId?: string; status?: string; qrCode?: string; qrCodeBase64?: string; extraTrackings?: number; daysToAdd?: number }) => {
    const id = randomUUID()
    db().prepare(
      'INSERT INTO Payment (id, userId, type, amount, pushinpayId, status, qrCode, qrCodeBase64, extraTrackings, daysToAdd) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.userId, data.type, data.amount, data.pushinpayId || null, data.status || 'pending', data.qrCode || null, data.qrCodeBase64 || null, data.extraTrackings || 0, data.daysToAdd || 0)
    return db().prepare('SELECT * FROM Payment WHERE id = ?').get(id)
  },

  getPaymentById: (id: string) => {
    return db().prepare('SELECT * FROM Payment WHERE id = ?').get(id)
  },

  getPaymentByPushinpayId: (pushinpayId: string) => {
    return db().prepare('SELECT * FROM Payment WHERE pushinpayId = ?').get(pushinpayId)
  },

  updatePaymentStatus: (id: string, status: string) => {
    db().prepare('UPDATE Payment SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(status, id)
  },

  getPendingPaymentForUser: (userId: string) => {
    return db().prepare("SELECT * FROM Payment WHERE userId = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1").get(userId)
  },
}
