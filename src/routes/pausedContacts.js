import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  getAllPausedContacts,
  resumeContact,
  getPauseInfo,
  cleanupExpiredPauses,
} from '../database/pausedContacts.js';
import db from '../database/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get all paused contacts
router.get('/dashboard/paused-contacts', requireAuth, (req, res) => {
  // Clean up expired first
  cleanupExpiredPauses();

  const paused = getAllPausedContacts();

  const contacts = paused.map((row) => ({
    chatId: row.chat_id,
    number: row.chat_id.replace('@c.us', '').replace('@g.us', ''),
    isGroup: row.chat_id.endsWith('@g.us'),
    pausedAt: row.paused_at,
    expiresAt: row.expires_at,
    remainingMs: row.expires_at - Date.now(),
  }));

  res.json({ ok: true, contacts });
});

// Update pause expiration time
router.put('/dashboard/paused-contacts/:chatId', requireAuth, (req, res) => {
  try {
    const chatId = decodeURIComponent(req.params.chatId);
    const { expiresAt } = req.body;

    if (!expiresAt) {
      return res.status(400).json({ ok: false, error: 'expiresAt is required' });
    }

    const newExpiresAt = new Date(expiresAt).getTime();

    if (isNaN(newExpiresAt)) {
      return res.status(400).json({ ok: false, error: 'Invalid date format' });
    }

    const stmt = db.prepare('UPDATE paused_contacts SET expires_at = ? WHERE chat_id = ?');
    const result = stmt.run(newExpiresAt, chatId);

    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: 'Contact not found' });
    }

    logger.log('PausedContacts', `Updated expiration for ${chatId}`);
    res.json({ ok: true, message: 'Pause updated' });
  } catch (err) {
    logger.error('PausedContacts', `Error updating pause: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Failed to update pause' });
  }
});

// Remove pause (resume webhook)
router.delete('/dashboard/paused-contacts/:chatId', requireAuth, (req, res) => {
  try {
    const chatId = decodeURIComponent(req.params.chatId);

    resumeContact(chatId);

    logger.log('PausedContacts', `Resumed webhook for ${chatId}`);
    res.json({ ok: true, message: 'Contact resumed' });
  } catch (err) {
    logger.error('PausedContacts', `Error resuming contact: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Failed to resume contact' });
  }
});

export default router;
