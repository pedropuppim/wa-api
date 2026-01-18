import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { getAllSettings, setMultipleSettings, SETTINGS_KEYS } from '../database/settings.js';
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
  };

  res.json({ ok: true, settings });
});

// Update settings
router.post('/dashboard/settings', requireAuth, (req, res) => {
  try {
    const { DASH_USER, DASH_PASS, WEBHOOK_URL, WEBHOOK_TOKEN, API_TOKEN } = req.body;

    // Validate webhook URL if provided
    if (WEBHOOK_URL && !isValidUrl(WEBHOOK_URL)) {
      return res.status(400).json({ ok: false, error: 'Invalid webhook URL' });
    }

    // Build settings object (only include non-empty values)
    const settings = {};

    if (DASH_USER) settings.DASH_USER = DASH_USER;
    if (DASH_PASS && DASH_PASS !== '••••••••') settings.DASH_PASS = DASH_PASS;
    if (WEBHOOK_URL) settings.WEBHOOK_URL = WEBHOOK_URL;
    if (WEBHOOK_TOKEN && WEBHOOK_TOKEN !== '••••••••') settings.WEBHOOK_TOKEN = WEBHOOK_TOKEN;
    if (API_TOKEN && API_TOKEN !== '••••••••') settings.API_TOKEN = API_TOKEN;

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
