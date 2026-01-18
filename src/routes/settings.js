import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getAllSettings, setMultipleSettings, SETTINGS_KEYS, SETTINGS_DEFAULTS } from '../database/settings.js';
import { config, reloadConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Get current settings (from DB or .env fallback)
router.get('/dashboard/settings', requireAuth, (req, res) => {
  const dbSettings = getAllSettings();

  // Return settings with DB values or .env fallback
  // Password is always masked, tokens are shown for copying
  const settings = {
    DASH_USER: dbSettings.DASH_USER || config.DASH_USER,
    DASH_PASS: '••••••••', // Always mask password
    WEBHOOK_URL: dbSettings.WEBHOOK_URL || config.WEBHOOK_URL,
    WEBHOOK_TOKEN: dbSettings.WEBHOOK_TOKEN || config.WEBHOOK_TOKEN,
    API_TOKEN: dbSettings.API_TOKEN || config.API_TOKEN,
    PAUSE_DURATION_HOURS: parseInt(dbSettings.PAUSE_DURATION_HOURS) || SETTINGS_DEFAULTS.PAUSE_DURATION_HOURS,
    WEBHOOK_ENABLED: dbSettings.WEBHOOK_ENABLED !== undefined ? dbSettings.WEBHOOK_ENABLED === 'true' : SETTINGS_DEFAULTS.WEBHOOK_ENABLED,
    AUTO_REPLY_ENABLED: dbSettings.AUTO_REPLY_ENABLED !== undefined ? dbSettings.AUTO_REPLY_ENABLED === 'true' : SETTINGS_DEFAULTS.AUTO_REPLY_ENABLED,
    AUTO_REPLY_MESSAGE: dbSettings.AUTO_REPLY_MESSAGE || SETTINGS_DEFAULTS.AUTO_REPLY_MESSAGE,
  };

  res.json({ ok: true, settings });
});

// Update settings
router.post('/dashboard/settings', requireAuth, (req, res) => {
  try {
    const {
      DASH_USER,
      DASH_PASS,
      WEBHOOK_URL,
      WEBHOOK_TOKEN,
      API_TOKEN,
      PAUSE_DURATION_HOURS,
      WEBHOOK_ENABLED,
      AUTO_REPLY_ENABLED,
      AUTO_REPLY_MESSAGE,
    } = req.body;

    // Validate webhook URL if provided
    if (WEBHOOK_URL && !isValidUrl(WEBHOOK_URL)) {
      return res.status(400).json({ ok: false, error: 'Invalid webhook URL' });
    }

    // Validate pause duration
    if (PAUSE_DURATION_HOURS !== undefined) {
      const hours = parseInt(PAUSE_DURATION_HOURS);
      if (isNaN(hours) || hours < 1 || hours > 72) {
        return res.status(400).json({ ok: false, error: 'Pause duration must be between 1 and 72 hours' });
      }
    }

    // Build settings object (only include non-empty values)
    const settings = {};

    if (DASH_USER) settings.DASH_USER = DASH_USER;
    if (DASH_PASS && DASH_PASS !== '••••••••') settings.DASH_PASS = DASH_PASS;
    if (WEBHOOK_URL) settings.WEBHOOK_URL = WEBHOOK_URL;
    if (WEBHOOK_TOKEN && WEBHOOK_TOKEN !== '••••••••') settings.WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    if (API_TOKEN && API_TOKEN !== '••••••••') settings.API_TOKEN = API_TOKEN;
    if (PAUSE_DURATION_HOURS) settings.PAUSE_DURATION_HOURS = String(PAUSE_DURATION_HOURS);

    // Boolean settings (always save)
    if (WEBHOOK_ENABLED !== undefined) settings.WEBHOOK_ENABLED = String(WEBHOOK_ENABLED);
    if (AUTO_REPLY_ENABLED !== undefined) settings.AUTO_REPLY_ENABLED = String(AUTO_REPLY_ENABLED);

    // Auto-reply message (can be empty to clear)
    if (AUTO_REPLY_MESSAGE !== undefined) settings.AUTO_REPLY_MESSAGE = AUTO_REPLY_MESSAGE;

    // Save to database
    setMultipleSettings(settings);

    // Reload config
    reloadConfig();

    logger.log('Settings', 'Settings updated successfully');

    res.json({ ok: true, message: 'Settings saved successfully' });
  } catch (err) {
    logger.error('Settings', `Failed to save settings: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Failed to save settings' });
  }
});

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export default router;
