/**
 * Script de inicialização do banco de dados em produção.
 * Executar uma vez após o deploy: node scripts/setup-production.js
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Usa o caminho de produção (Render) ou local
const dbPath = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '')
  : path.join(__dirname, '..', 'prisma', 'dev.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);
console.log('Banco:', dbPath);

// Cria tabelas
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
  CREATE TABLE IF NOT EXISTS TrackingCode (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    clientId TEXT,
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
`);

// Cria admin se não existirif (!existing) {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || '3411', 12);
  const id = require('crypto').randomBytes(12).toString('hex');
  db.prepare('INSERT INTO Admin (id, username, password) VALUES (?, ?, ?)').run(
    id,
    process.env.ADMIN_USERNAME || 'foster',
    hash
  );
  console.log('Admin criado:', process.env.ADMIN_USERNAME || 'foster');
} else {
  console.log('Admin já existe.');
}

db.close();
console.log('Setup concluído!');
