import db from './index.js';

// Available settings keys
export const SETTINGS_KEYS = {
  DASH_USER: 'DASH_USER',
  DASH_PASS: 'DASH_PASS',
  WEBHOOK_URL: 'WEBHOOK_URL',
  WEBHOOK_TOKEN: 'WEBHOOK_TOKEN',
  API_TOKEN: 'API_TOKEN',
  PAUSE_DURATION_HOURS: 'PAUSE_DURATION_HOURS',
};

// Default values
export const SETTINGS_DEFAULTS = {
  PAUSE_DURATION_HOURS: 4,
};

// Get a setting value
export function getSetting(key) {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key);
  return row ? row.value : null;
}

// Set a setting value
export function setSetting(key, value) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `);
  stmt.run(key, value, value);
}

// Get all settings
export function getAllSettings() {
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// Set multiple settings at once
export function setMultipleSettings(settings) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `);

  const transaction = db.transaction((items) => {
    for (const [key, value] of Object.entries(items)) {
      if (value !== undefined && value !== null && value !== '') {
        stmt.run(key, value, value);
      }
    }
  });

  transaction(settings);
}

// Delete a setting
export function deleteSetting(key) {
  const stmt = db.prepare('DELETE FROM settings WHERE key = ?');
  stmt.run(key);
}
