import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

// Ensure directory exists (though it should already)
if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// Helper to generate IDs similar to cuid
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const query = {
  // Clients
  getClients: () => {
    return db.prepare('SELECT * FROM Client ORDER BY createdAt DESC').all();
  },
  getClientById: (id: string) => {
    return db.prepare('SELECT * FROM Client WHERE id = ?').get(id);
  },
  createClient: (data: { name: string; email?: string; phone?: string }) => {
    const id = generateId();
    db.prepare('INSERT INTO Client (id, name, email, phone) VALUES (?, ?, ?, ?)').run(
      id, data.name, data.email || null, data.phone || null
    );
    return { id, ...data };
  },
  deleteClient: (id: string) => {
    return db.prepare('DELETE FROM Client WHERE id = ?').run(id);
  },

  // Tracking Codes
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
  createTrackingCode: (data: { code: string; clientId?: string | null }) => {
    const id = generateId();
    db.prepare('INSERT INTO TrackingCode (id, code, clientId) VALUES (?, ?, ?)').run(
      id, data.code.toUpperCase(), data.clientId || null
    );
    return { id, ...data };
  },
  deleteTrackingCode: (id: string) => {
    return db.prepare('DELETE FROM TrackingCode WHERE id = ?').run(id);
  },

  // Tracking Events
  createTrackingEvent: (data: { trackingCodeId: string; status: string; location?: string | null; date?: string }) => {
    const id = generateId();
    const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();
    db.prepare('INSERT INTO TrackingEvent (id, status, location, date, trackingCodeId) VALUES (?, ?, ?, ?, ?)').run(
      id, data.status, data.location || null, date, data.trackingCodeId
    );
    return { id, ...data, date };
  },
  deleteTrackingEvent: (id: string) => {
    return db.prepare('DELETE FROM TrackingEvent WHERE id = ?').run(id);
  }
};

export default db;
