import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Resolve DB path: use DATABASE_URL if set, fallback to local prisma/dev.db
const resolvedDbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(process.cwd(), 'prisma', 'dev.db');

// During Next.js build on Render, /data (Persistent Disk) is not mounted.
// Fall back to an ephemeral path so the build can complete.
let dbPath = resolvedDbPath;
try {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch {
  // If we can't create the directory (e.g. /data during build), use a temp fallback
  dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  const fallbackDir = path.dirname(dbPath);
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
}

const db = new Database(dbPath);

// Migrations: add columns safely
const migrate = (sql: string) => { try { db.prepare(sql).run(); } catch (_) { /* already exists */ } };
migrate('ALTER TABLE Client ADD COLUMN userId TEXT');
migrate('ALTER TABLE User ADD COLUMN keyauthKey TEXT');
migrate('ALTER TABLE TrackingCode ADD COLUMN autoTemplateId TEXT');
migrate('ALTER TABLE TrackingCode ADD COLUMN autoStartedAt TEXT');
migrate('ALTER TABLE TrackingCode ADD COLUMN autoCurrentStep INTEGER DEFAULT 0');

// Create AutoTemplate tables if they don't exist
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS AutoTemplate (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS AutoTemplateStep (
      id TEXT PRIMARY KEY,
      autoTemplateId TEXT NOT NULL,
      dayOffset INTEGER NOT NULL DEFAULT 0,
      time TEXT DEFAULT '09:00',
      status TEXT NOT NULL,
      location TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (autoTemplateId) REFERENCES AutoTemplate(id) ON DELETE CASCADE
    );
  `);
} catch (_) { /* tables already exist */ }

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

export const query = {
  // --- Clients ---
  getClients: () => db.prepare('SELECT * FROM Client ORDER BY createdAt DESC').all(),
  getClientsByUserId: (userId: string) => db.prepare('SELECT * FROM Client WHERE userId = ? ORDER BY createdAt DESC').all(userId),
  getClientById: (id: string) => db.prepare('SELECT * FROM Client WHERE id = ?').get(id),
  createClient: (data: { name: string; email?: string; phone?: string; userId?: string }) => {
    const id = generateId();
    db.prepare('INSERT INTO Client (id, name, email, phone, userId) VALUES (?, ?, ?, ?, ?)').run(
      id, data.name, data.email || null, data.phone || null, data.userId || null
    );
    return { id, ...data };
  },
  deleteClient: (id: string) => db.prepare('DELETE FROM Client WHERE id = ?').run(id),

  // --- Tracking Codes ---
  getTrackingCodes: () => {
    const codes = db.prepare(`
      SELECT tc.*, c.name as clientName
      FROM TrackingCode tc
      LEFT JOIN Client c ON tc.clientId = c.id
      ORDER BY tc.createdAt DESC
    `).all() as any[];
    return codes.map(tc => ({
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: db.prepare('SELECT * FROM TrackingEvent WHERE trackingCodeId = ? ORDER BY date DESC').all(tc.id)
    }));
  },
  getTrackingCodesByUserId: (userId: string) => {
    const codes = db.prepare(`
      SELECT * FROM TrackingCode WHERE userId = ? ORDER BY createdAt DESC
    `).all(userId) as any[];
    return codes.map(tc => ({
      ...tc,
      events: db.prepare('SELECT * FROM TrackingEvent WHERE trackingCodeId = ? ORDER BY date DESC').all(tc.id)
    }));
  },
  getTrackingCodeByCode: (code: string) => {
    const tc = db.prepare(`
      SELECT tc.*, c.name as clientName
      FROM TrackingCode tc
      LEFT JOIN Client c ON tc.clientId = c.id
      WHERE tc.code = ?
    `).get(code) as any;
    if (!tc) return null;
    return {
      ...tc,
      client: tc.clientId ? { id: tc.clientId, name: tc.clientName } : null,
      events: db.prepare('SELECT * FROM TrackingEvent WHERE trackingCodeId = ? ORDER BY date DESC').all(tc.id)
    };
  },
  getTrackingCodeById: (id: string) => {
    const tc = db.prepare('SELECT * FROM TrackingCode WHERE id = ?').get(id) as any;
    if (!tc) return null;
    return {
      ...tc,
      events: db.prepare('SELECT * FROM TrackingEvent WHERE trackingCodeId = ? ORDER BY date DESC').all(tc.id)
    };
  },
  createTrackingCode: (data: { code: string; clientId?: string | null; userId?: string | null; description?: string | null }) => {
    const id = generateId();
    db.prepare('INSERT INTO TrackingCode (id, code, clientId, userId, description) VALUES (?, ?, ?, ?, ?)').run(
      id, data.code.toUpperCase(), data.clientId || null, data.userId || null, data.description || null
    );
    return { id, ...data };
  },
  updateTrackingCode: (id: string, data: { description?: string; clientId?: string | null }) => {
    const sets: string[] = [];
    const values: any[] = [];
    if ('description' in data) { sets.push('description = ?'); values.push(data.description || null); }
    if ('clientId' in data) { sets.push('clientId = ?'); values.push(data.clientId || null); }
    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE TrackingCode SET ${sets.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    }
  },
  deleteTrackingCode: (id: string) => db.prepare('DELETE FROM TrackingCode WHERE id = ?').run(id),

  // --- Auto Update (Automation) ---
  activateAutoUpdate: (trackingCodeId: string, templateId: string, startedAt: string) => {
    db.prepare('UPDATE TrackingCode SET autoTemplateId = ?, autoStartedAt = ?, autoCurrentStep = -1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(
      templateId, startedAt, trackingCodeId
    );
  },
  deactivateAutoUpdate: (trackingCodeId: string) => {
    db.prepare('UPDATE TrackingCode SET autoTemplateId = NULL, autoStartedAt = NULL, autoCurrentStep = -1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(
      trackingCodeId
    );
  },
  getActiveAutoUpdates: () => {
    return db.prepare('SELECT * FROM TrackingCode WHERE autoTemplateId IS NOT NULL').all() as any[];
  },
  updateAutoUpdateLastStep: (trackingCodeId: string, stepIndex: number) => {
    db.prepare('UPDATE TrackingCode SET autoCurrentStep = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(
      stepIndex, trackingCodeId
    );
  },

  // --- Tracking Events ---
  createTrackingEvent: (data: { trackingCodeId: string; status: string; location?: string | null; date?: string }) => {
    const id = generateId();
    const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
    db.prepare('INSERT INTO TrackingEvent (id, status, location, date, trackingCodeId) VALUES (?, ?, ?, ?, ?)').run(
      id, data.status, data.location || null, date, data.trackingCodeId
    );
    return { id, ...data, date };
  },
  deleteTrackingEvent: (id: string) => db.prepare('DELETE FROM TrackingEvent WHERE id = ?').run(id),

  // --- Users ---
  getUserById: (id: string) => db.prepare('SELECT * FROM User WHERE id = ?').get(id) as any,
  getUserByUsername: (username: string) => db.prepare('SELECT * FROM User WHERE username = ?').get(username) as any,
  getUserByKeyauthKey: (keyauthKey: string) => db.prepare('SELECT * FROM User WHERE keyauthKey = ?').get(keyauthKey) as any,
  getAllUsers: () => db.prepare('SELECT id, username, email, expiresAt, trackingLimit, trackingUsed, active, createdAt FROM User ORDER BY createdAt DESC').all(),
  createUser: (data: { username: string; email?: string; password: string; registrationKeyId?: string; expiresAt?: string; keyauthKey?: string }) => {
    const id = generateId();
    db.prepare(`
      INSERT INTO User (id, username, email, password, registrationKeyId, expiresAt, keyauthKey)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.email || null, data.password, data.registrationKeyId || null, data.expiresAt || null, data.keyauthKey || null);
    return { id, ...data };
  },
  updateUser: (id: string, data: Partial<{ active: number; expiresAt: string; trackingLimit: number; trackingUsed: number }>) => {
    const fields = Object.entries(data).map(([k]) => `${k} = ?`).join(', ');
    const values = Object.values(data);
    db.prepare(`UPDATE User SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id);
  },
  incrementTrackingUsed: (userId: string) => {
    db.prepare('UPDATE User SET trackingUsed = trackingUsed + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  },
  addDaysToUser: (userId: string, days: number) => {
    const user = db.prepare('SELECT expiresAt FROM User WHERE id = ?').get(userId) as any;
    const base = user?.expiresAt ? new Date(user.expiresAt) : new Date();
    if (base < new Date()) base.setTime(new Date().getTime()); // se expirado, conta da data atual
    base.setDate(base.getDate() + days);
    db.prepare('UPDATE User SET expiresAt = ?, active = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(base.toISOString(), userId);
  },
  addTrackingsToUser: (userId: string, amount: number) => {
    db.prepare('UPDATE User SET trackingLimit = trackingLimit + ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(amount, userId);
  },
  updateUserPassword: (userId: string, hashedPassword: string) => {
    db.prepare('UPDATE User SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(hashedPassword, userId);
  },

  // --- Registration Keys ---
  getKeyByValue: (key: string) => db.prepare('SELECT * FROM RegistrationKey WHERE key = ?').get(key) as any,
  getAllKeys: () => db.prepare('SELECT * FROM RegistrationKey ORDER BY createdAt DESC').all(),
  createKey: (key: string) => {
    const id = generateId();
    db.prepare('INSERT INTO RegistrationKey (id, key) VALUES (?, ?)').run(id, key);
    return { id, key };
  },
  markKeyUsed: (keyId: string, userId: string) => {
    db.prepare('UPDATE RegistrationKey SET used = 1, usedById = ?, usedAt = CURRENT_TIMESTAMP WHERE id = ?').run(userId, keyId);
  },
  deleteKey: (id: string) => db.prepare('DELETE FROM RegistrationKey WHERE id = ?').run(id),

  // --- Payments ---
  createPayment: (data: { userId: string; type: string; amount: number; pushinpayId?: string; qrCode?: string; qrCodeBase64?: string; extraTrackings?: number; daysToAdd?: number }) => {
    const id = generateId();
    db.prepare(`
      INSERT INTO Payment (id, userId, type, amount, pushinpayId, status, qrCode, qrCodeBase64, extraTrackings, daysToAdd)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `).run(id, data.userId, data.type, data.amount, data.pushinpayId || null, data.qrCode || null, data.qrCodeBase64 || null, data.extraTrackings || 0, data.daysToAdd || 0);
    return { id, ...data };
  },
  getAllPayments: () => db.prepare('SELECT * FROM Payment ORDER BY createdAt DESC').all(),
  getPaymentById: (id: string) => db.prepare('SELECT * FROM Payment WHERE id = ?').get(id) as any,
  getPaymentByPushinpayId: (pushinpayId: string) => db.prepare('SELECT * FROM Payment WHERE pushinpayId = ?').get(pushinpayId) as any,
  updatePaymentStatus: (id: string, status: string) => {
    db.prepare('UPDATE Payment SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  },
  getPendingPaymentForUser: (userId: string, type: string) => {
    return db.prepare("SELECT * FROM Payment WHERE userId = ? AND type = ? AND status = 'pending' ORDER BY createdAt DESC LIMIT 1").get(userId, type) as any;
  },

  // --- Auto Templates ---
  getAutoTemplatesByUserId: (userId: string) => {
    return db.prepare('SELECT * FROM AutoTemplate WHERE userId = ? ORDER BY createdAt DESC').all(userId) as any[];
  },
  getAutoTemplateById: (id: string) => {
    return db.prepare('SELECT * FROM AutoTemplate WHERE id = ?').get(id) as any;
  },
  getAutoTemplateSteps: (autoTemplateId: string) => {
    return db.prepare('SELECT * FROM AutoTemplateStep WHERE autoTemplateId = ? ORDER BY dayOffset ASC, time ASC').all(autoTemplateId) as any[];
  },
  createAutoTemplate: (data: { name: string; userId: string }) => {
    const id = generateId();
    db.prepare('INSERT INTO AutoTemplate (id, name, userId) VALUES (?, ?, ?)').run(id, data.name, data.userId);
    return { id, ...data };
  },
  deleteAutoTemplate: (id: string) => db.prepare('DELETE FROM AutoTemplate WHERE id = ?').run(id),
  createAutoTemplateStep: (data: { autoTemplateId: string; dayOffset: number; time?: string; status: string; location?: string }) => {
    const id = generateId();
    db.prepare('INSERT INTO AutoTemplateStep (id, autoTemplateId, dayOffset, time, status, location) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, data.autoTemplateId, data.dayOffset, data.time || '09:00', data.status, data.location || null
    );
    return { id, ...data };
  },
  deleteAutoTemplateStep: (id: string) => db.prepare('DELETE FROM AutoTemplateStep WHERE id = ?').run(id),
};

export function runTransaction<T>(fn: () => T): T {
  const transaction = db.transaction(fn);
  return transaction();
}

export default db;