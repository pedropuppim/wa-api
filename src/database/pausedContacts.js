import db from './index.js';

const PAUSE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pause webhook for a contact
export function pauseContact(chatId) {
  const now = Date.now();
  const expiresAt = now + PAUSE_DURATION_MS;

  const stmt = db.prepare(`
    INSERT INTO paused_contacts (chat_id, paused_at, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET paused_at = ?, expires_at = ?
  `);

  stmt.run(chatId, now, expiresAt, now, expiresAt);
}

// Check if contact is paused
export function isContactPaused(chatId) {
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT expires_at FROM paused_contacts WHERE chat_id = ? AND expires_at > ?
  `);

  const row = stmt.get(chatId, now);
  return !!row;
}

// Resume webhook for a contact (remove pause)
export function resumeContact(chatId) {
  const stmt = db.prepare('DELETE FROM paused_contacts WHERE chat_id = ?');
  stmt.run(chatId);
}

// Get pause info for a contact
export function getPauseInfo(chatId) {
  const stmt = db.prepare('SELECT * FROM paused_contacts WHERE chat_id = ?');
  const row = stmt.get(chatId);

  if (!row || row.expires_at <= Date.now()) {
    return null;
  }

  return {
    chatId: row.chat_id,
    pausedAt: new Date(row.paused_at),
    expiresAt: new Date(row.expires_at),
    remainingMs: row.expires_at - Date.now(),
  };
}

// Clean up expired pauses
export function cleanupExpiredPauses() {
  const stmt = db.prepare('DELETE FROM paused_contacts WHERE expires_at <= ?');
  const result = stmt.run(Date.now());
  return result.changes;
}

// Get all paused contacts
export function getAllPausedContacts() {
  const now = Date.now();
  const stmt = db.prepare('SELECT * FROM paused_contacts WHERE expires_at > ?');
  return stmt.all(now);
}
