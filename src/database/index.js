import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../data/settings.db');

// Ensure data directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, '../../data'), { recursive: true });

// Initialize database
const db = new Database(dbPath);

// Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create paused_contacts table (for manual takeover)
db.exec(`
  CREATE TABLE IF NOT EXISTS paused_contacts (
    chat_id TEXT PRIMARY KEY,
    paused_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

export default db;
