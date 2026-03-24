/**
 * Script de inicializaÃ§Ã£o do banco de dados em produÃ§Ã£o.
 * Executado automaticamente via postinstall no Render.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(__dirname, '..', 'prisma', 'dev.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
console.log('Banco:', dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS Admin (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS Client (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS RegistrationKey (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    used INTEGER DEFAULT 0,
    usedById TEXT,
    usedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    registrationKeyId TEXT,
    expiresAt DATETIME,
    trackingLimit INTEGER DEFAULT 200,
    trackingUsed INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS TrackingCode (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    clientId TEXT,
    userId TEXT,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS TrackingEvent (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    location TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    trackingCodeId TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trackingCodeId) REFERENCES TrackingCode(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS Payment (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    pushinpayId TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    qrCode TEXT,
    qrCodeBase64 TEXT,
    extraTrackings INTEGER DEFAULT 0,
    daysToAdd INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tabelas de automaÃ§Ã£o
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
    sortOrder INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autoTemplateId) REFERENCES AutoTemplate(id) ON DELETE CASCADE
  );
`);

// MigraÃ§Ã£o segura: adiciona colunas novas sem quebrar DBs existentes
const migrate = (sql) => { try { db.exec(sql); } catch(e) {} };
migrate('ALTER TABLE TrackingCode ADD COLUMN userId TEXT');
migrate('ALTER TABLE TrackingCode ADD COLUMN description TEXT');
migrate('ALTER TABLE User ADD COLUMN keyauthKey TEXT');
  migrate('ALTER TABLE AutoTemplateStep ADD COLUMN sortOrder INTEGER DEFAULT 0');

const existing = db.prepare('SELECT id FROM Admin WHERE username = ?').get(
  process.env.ADMIN_USERNAME || 'foster'
);
if (!existing) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '3411', 12);
  const id = require('crypto').randomBytes(12).toString('hex');
  db.prepare('INSERT INTO Admin (id, username, password) VALUES (?, ?, ?)').run(
    id, process.env.ADMIN_USERNAME || 'foster', hash
  );
  console.log('Admin criado:', process.env.ADMIN_USERNAME || 'foster');
} else {
  console.log('Admin jÃ¡ existe.');
}

db.close();
console.log('Setup concluÃ­do!');
