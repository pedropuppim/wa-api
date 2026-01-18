import db from './index.js';

const AUTO_REPLY_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

// Check if we can send auto-reply to this contact
export function canSendAutoReply(chatId) {
  const now = Date.now();

  const stmt = db.prepare('SELECT last_reply_at FROM auto_reply_log WHERE chat_id = ?');
  const row = stmt.get(chatId);

  if (!row) {
    return true; // Never sent, can send
  }

  // Check if cooldown has passed
  return (now - row.last_reply_at) >= AUTO_REPLY_COOLDOWN_MS;
}

// Record that we sent an auto-reply
export function recordAutoReply(chatId) {
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO auto_reply_log (chat_id, last_reply_at, message_count)
    VALUES (?, ?, 1)
    ON CONFLICT(chat_id) DO UPDATE SET last_reply_at = ?, message_count = 1
  `);

  stmt.run(chatId, now, now);
}

// Increment message count (for tracking without sending reply)
export function incrementMessageCount(chatId) {
  const stmt = db.prepare(`
    UPDATE auto_reply_log SET message_count = message_count + 1 WHERE chat_id = ?
  `);

  stmt.run(chatId);
}

// Get message count for a contact
export function getMessageCount(chatId) {
  const stmt = db.prepare('SELECT message_count FROM auto_reply_log WHERE chat_id = ?');
  const row = stmt.get(chatId);
  return row ? row.message_count : 0;
}

// Clean up old entries (optional, for maintenance)
export function cleanupOldEntries(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs;
  const stmt = db.prepare('DELETE FROM auto_reply_log WHERE last_reply_at < ?');
  return stmt.run(cutoff).changes;
}
