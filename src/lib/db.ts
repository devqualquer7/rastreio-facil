import Database from 'better-sqlite3'
import { join } from 'path'
import { randomUUID } from 'crypto'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || join(process.cwd(), 'prisma/dev.db')

let _db: Database.Database | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')

    // Ensure all tables exist
    _db.exec(`
      CREATE TABLE IF NOT EXISTS Admin (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Client (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS TrackingCode (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        clientId TEXT,
        userId TEXT,
        description TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS TrackingEvent (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        location TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        trackingCodeId TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trackingCodeId) REFERENCES TrackingCode(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        registrationKeyId TEXT,
        expiresAt TEXT,
        trackingUsed INTEGER DEFAULT 0,
        trackingLimit INTEGER DEFAULT 50,
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

      CREATE TABLE IF NOT EXISTS AutoTemplate (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS AutoTemplateStep (
        id TEXT PRIMARY KEY,
        templateId TEXT NOT NULL,
        dayOffset INTEGER NOT NULL DEFAULT 0,
        time TEXT NOT NULL DEFAULT '08:00',
        status TEXT NOT NULL,
        location TEXT,
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (templateId) REFERENCES AutoTemplate(id) ON DELETE CASCADE
      );
    `)

    // Migration: allow NULL email (fix registration without email)
    try {
      const emailCol = (_db.prepare("PRAGMA table_info(User)").all() as any[]).find((c: any) => c.name === 'email')
      if (emailCol && emailCol.notnull === 1) {
        _db.exec(`
          CREATE TABLE User_v2 (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE,
            password TEXT NOT NULL,
            registrationKeyId TEXT,
            expiresAt TEXT,
            trackingUsed INTEGER DEFAULT 0,
            trackingLimit INTEGER DEFAULT 50,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO User_v2 SELECT * FROM User;
          DROP TABLE User;
          ALTER TABLE User_v2 RENAME TO User;
        `)
      }
    } catch (migErr) { console.error('email migration:', migErr) }

    // Migration: add userId and description columns to TrackingCode if missing
    try {
      const cols = (_db.prepare("PRAGMA table_info(TrackingCode)").all() as any[]).map((c: any) => c.name)
      if (!cols.includes('userId')) _db.exec('ALTER TABLE TrackingCode ADD COLUMN userId TEXT')
      if (!cols.includes('description')) _db.exec('ALTER TABLE TrackingCode ADD COLUMN description TEXT')
    } catch (e) { console.error('TrackingCode migration:', e) }

    // Migration: add keyauthKey and active columns to User if missing
    try {
      const userCols = (_db.prepare("PRAGMA table_info(User)").all() as any[]).map((c: any) => c.name)
      if (!userCols.includes('keyauthKey')) _db.exec('ALTER TABLE User ADD COLUMN keyauthKey TEXT')
      if (!userCols.includes('active')) _db.exec('ALTER TABLE User ADD COLUMN active INTEGER DEFAULT 1')
    } catch (e) { console.error('User keyauthKey/active migration:', e) }

    // Migration: add autoTemplateId and autoActivatedAt to TrackingCode
    try {
      const tcCols = (_db.prepare("PRAGMA table_info(TrackingCode)").all() as any[]).map((c: any) => c.name)
      if (!tcCols.includes('autoTemplateId')) _db.exec('ALTER TABLE TrackingCode ADD COLUMN autoTemplateId TEXT')
      if (!tcCols.includes('autoActivatedAt')) _db.exec('ALTER TABLE TrackingCode ADD COLUMN autoActivatedAt TEXT')
    } catch (e) { console.error('TrackingCode auto-update migration:', e) }
  }
  return _db
}

// Migration: add userId column to Client if not present
try { db().prepare('ALTER TABLE Client ADD COLUMN userId TEXT').run(); } catch (_) { /* column already exists */ }

export const query = {
  // ── Admin ──────────────────────────────────────────────────────────
  getAdminByUsername: (username: string) => {
    return db().prepare('SELECT * FROM Admin WHERE username = ?').get(username)
  },
  getAdminById: (id: string) => {
    return db().prepare('SELECT * FROM Admin WHERE id = ?').get(id)
  },

  // ── Clients ────────────────────────────────────────────────────────
  getClients: () => {
    return db().prepare('SELECT * FROM Client ORDER BY createdAt DESC').all()
  },
  getClientsByUserId: (userId: string) => {
    return db().prepare('SELECT * FROM Client WHERE userId = ? ORDER BY createdAt DESC').all(userId)
  },
  getClientById: (id: string) => {
    return db().prepare('SELECT * FROM Client WHERE id = ?').get(id)
  },
  createClient: (data: { name: string; email?: string; phone?: string; userId?: string }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO Client (id, name, email, phone, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.email || null, data.phone || null, data.userId || null, now, now)
    return db().prepare('SELECT * FROM Client WHERE id = ?').get(id)
  },
  deleteClient: (id: string) => {
    return db().prepare('DELETE FROM Client WHERE id = ?').run(id)
  },

  // ── Tracking Codes ─────────────────────────────────────────────────
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
      'SELECT tc.*, c.name as clientName FROM TrackingCode tc LEFT JOIN Client c ON tc.clientId = c.id WHERE tc.userId = ? ORDER BY tc.createdAt DESC'
    ).all(userId) as any[]
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

  createTrackingCode: (data: { code: string; clientId?: string | null; userId?: string | null; description?: string | null }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO TrackingCode (id, code, clientId, userId, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.code, data.clientId || null, data.userId || null, data.description || null, now, now)
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

  // ── Tracking Events ────────────────────────────────────────────────
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

  // ── Users (SaaS subscribers) ───────────────────────────────────────
  getUserById: (id: string) => {
    return db().prepare('SELECT * FROM User WHERE id = ?').get(id)
  },
  getUserByUsername: (username: string) => {
    return db().prepare('SELECT * FROM User WHERE username = ?').get(username)
  },
  getUserByKeyauthKey: (key: string) => {
    return db().prepare('SELECT * FROM User WHERE keyauthKey = ?').get(key)
  },
  getAllUsers: () => {
    return db().prepare('SELECT * FROM User ORDER BY createdAt DESC').all()
  },
  createUser: (data: { username: string; email?: string; password: string; registrationKeyId?: string; expiresAt?: string; keyauthKey?: string }) => {
    const id = randomUUID()
    db().prepare(
      'INSERT INTO User (id, username, email, password, registrationKeyId, expiresAt, keyauthKey) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.username, data.email ?? null, data.password, data.registrationKeyId || null, data.expiresAt || null, data.keyauthKey || null)
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
    db().prepare('UPDATE User SET trackingUsed = trackingUsed + 1 WHERE id = ?').run(userId)
  },

  addDaysToUser: (userId: string, days: number) => {
    db().prepare(`UPDATE User SET expiresAt = datetime(COALESCE(expiresAt, datetime('now')), '+${days} days') WHERE id = ?`).run(userId)
  },

  addTrackingsToUser: (userId: string, count: number) => {
    db().prepare('UPDATE User SET trackingLimit = trackingLimit + ? WHERE id = ?').run(count, userId)
  },

  removeDaysFromUser: (userId: string, days: number) => {
    const d = Math.abs(Math.round(Number(days)))
    db().prepare(`UPDATE User SET expiresAt = datetime(COALESCE(expiresAt, datetime('now')), '-${d} days') WHERE id = ?`).run(userId)
  },

  removeTrackingsFromUser: (userId: string, count: number) => {
    const c = Math.abs(Math.round(Number(count)))
    db().prepare('UPDATE User SET trackingLimit = MAX(0, trackingLimit - ?) WHERE id = ?').run(c, userId)
  },

  // ── Registration Keys ──────────────────────────────────────────────
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
    db().prepare('UPDATE RegistrationKey SET used = 1, usedBy = ?, usedAt = CURRENT_TIMESTAMP WHERE id = ?').run(usedBy, id)
  },
  deleteKey: (id: string) => {
    return db().prepare('DELETE FROM RegistrationKey WHERE id = ?').run(id)
  },

  // ── Payments ───────────────────────────────────────────────────────
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

  // ── Auto Templates ─────────────────────────────────────────────────
  getAutoTemplatesByUserId: (userId: string) => {
    return db().prepare('SELECT * FROM AutoTemplate WHERE userId = ? ORDER BY createdAt DESC').all(userId)
  },
  getAutoTemplateById: (id: string) => {
    return db().prepare('SELECT * FROM AutoTemplate WHERE id = ?').get(id)
  },
  createAutoTemplate: (data: { userId: string; name: string }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare('INSERT INTO AutoTemplate (id, userId, name, createdAt) VALUES (?, ?, ?, ?)').run(id, data.userId, data.name, now)
    return db().prepare('SELECT * FROM AutoTemplate WHERE id = ?').get(id)
  },
  deleteAutoTemplate: (id: string) => {
    return db().prepare('DELETE FROM AutoTemplate WHERE id = ?').run(id)
  },

  // ── Auto Template Steps ────────────────────────────────────────────
  getAutoTemplateSteps: (templateId: string) => {
    return db().prepare('SELECT * FROM AutoTemplateStep WHERE templateId = ? ORDER BY sortOrder ASC').all(templateId)
  },
  createAutoTemplateStep: (data: { templateId: string; dayOffset: number; time: string; status: string; location?: string | null; sortOrder?: number }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db().prepare(
      'INSERT INTO AutoTemplateStep (id, templateId, dayOffset, time, status, location, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.templateId, data.dayOffset, data.time, data.status, data.location || null, data.sortOrder || 0, now)
    return db().prepare('SELECT * FROM AutoTemplateStep WHERE id = ?').get(id)
  },
  deleteAutoTemplateStep: (id: string) => {
    return db().prepare('DELETE FROM AutoTemplateStep WHERE id = ?').run(id)
  },

  // ── Auto Update on Tracking Codes ──────────────────────────────────
  activateAutoUpdate: (trackingCodeId: string, templateId: string) => {
    const now = new Date().toISOString()
    db().prepare('UPDATE TrackingCode SET autoTemplateId = ?, autoActivatedAt = ?, updatedAt = ? WHERE id = ?')
      .run(templateId, now, now, trackingCodeId)
  },
  deactivateAutoUpdate: (trackingCodeId: string) => {
    const now = new Date().toISOString()
    db().prepare('UPDATE TrackingCode SET autoTemplateId = NULL, autoActivatedAt = NULL, updatedAt = ? WHERE id = ?')
      .run(now, trackingCodeId)
  },
  getTrackingCodesWithAutoUpdate: (userId: string) => {
    return db().prepare(
      'SELECT * FROM TrackingCode WHERE userId = ? AND autoTemplateId IS NOT NULL AND autoActivatedAt IS NOT NULL'
    ).all(userId)
  },
}

export default query
export function runTransaction<T>(fn: () => T): T { return (db() as any).transaction(fn)() }
