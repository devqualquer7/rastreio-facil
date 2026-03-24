const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

let DB_PATH = process.env.DATABASE_URL || '/tmp/staging.db';

// Remove file: prefix if present (better-sqlite3 doesn't support it)
if (DB_PATH.startsWith('file:')) {
  DB_PATH = DB_PATH.replace('file:', '');
}

console.log('Setting up production database at:', DB_PATH);

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Admin (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    passwordHash TEXT NOT NULL,
    keyauthKey TEXT,
    planType TEXT DEFAULT 'free',
    planExpiry DATETIME,
    maxTrackingCodes INTEGER DEFAULT 5,
    pushinpayEmail TEXT,
    pushinpayToken TEXT,
    discordWebhookUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Client (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    userId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS TrackingCode (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    clientId TEXT,
    userId TEXT,
    description TEXT,
    autoTemplateId TEXT,
    autoUpdateActive INTEGER DEFAULT 0,
    autoUpdateActivatedAt TEXT,
    autoUpdateLastStepIndex INTEGER DEFAULT -1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES Client(id),
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS TrackingEvent (
    id TEXT PRIMARY KEY,
    trackingCodeId TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    date DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trackingCodeId) REFERENCES TrackingCode(id)
  );

  CREATE TABLE IF NOT EXISTS Payment (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    planType TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    pushinpayTxid TEXT,
    pixCode TEXT,
    pixQrCode TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS AutoTemplate (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id)
  );

  CREATE TABLE IF NOT EXISTS AutoTemplateStep (
    id TEXT PRIMARY KEY,
    templateId TEXT NOT NULL,
    dayOffset INTEGER NOT NULL DEFAULT 0,
    time TEXT NOT NULL DEFAULT '09:00',
    status TEXT NOT NULL,
    location TEXT,
    sortOrder INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (templateId) REFERENCES AutoTemplate(id)
  );
`);

// Migrations - add columns that might not exist
const migrations = [
  'ALTER TABLE Client ADD COLUMN userId TEXT',
  'ALTER TABLE User ADD COLUMN keyauthKey TEXT',
  'ALTER TABLE AutoTemplateStep ADD COLUMN sortOrder INTEGER DEFAULT 0',
  'ALTER TABLE TrackingCode ADD COLUMN autoTemplateId TEXT',
  'ALTER TABLE TrackingCode ADD COLUMN autoUpdateActive INTEGER DEFAULT 0',
  'ALTER TABLE TrackingCode ADD COLUMN autoUpdateActivatedAt TEXT',
  'ALTER TABLE TrackingCode ADD COLUMN autoUpdateLastStepIndex INTEGER DEFAULT -1',
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log('Migration applied:', sql);
  } catch (e) {
    // Column already exists, ignore
  }
}

// Create default admin if not exists
const adminExists = db.prepare('SELECT id FROM Admin WHERE username = ?').get('admin');
if (!adminExists) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO Admin (id, username, passwordHash) VALUES (?, ?, ?)').run(
    crypto.randomUUID(),
    'admin',
    hash
  );
  console.log('Default admin created (admin/admin123)');
}

console.log('Database setup complete!');
db.close();
