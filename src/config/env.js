import { z } from 'zod';
import dotenv from 'dotenv';
import { getAllSettings } from '../database/settings.js';

dotenv.config();

// Schema for validation
const envSchema = z.object({
  // Server (only from .env)
  APP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  APP_HOST: z.string().default('0.0.0.0'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  WHATSAPP_CLIENT_ID: z.string().min(1, 'WHATSAPP_CLIENT_ID is required'),

  // Configurable via dashboard (DB takes priority over .env)
  DASH_USER: z.string().min(1, 'DASH_USER is required'),
  DASH_PASS: z.string().min(1, 'DASH_PASS is required'),
  WEBHOOK_URL: z.string().url('WEBHOOK_URL must be a valid URL'),
  WEBHOOK_TOKEN: z.string().min(1, 'WEBHOOK_TOKEN is required'),
  API_TOKEN: z.string().min(1, 'API_TOKEN is required'),

  // Optional
  MEDIA_TMP_DIR: z.string().default('./tmp'),
  MEDIA_PUBLIC_DIR: z.string().default('./public/media'),
  BASE_URL: z.string().url().default('http://localhost:3000'),
});

// Load config merging DB settings with .env
function loadConfig() {
  const dbSettings = getAllSettings();

  // Merge: DB settings override .env
  const merged = {
    ...process.env,
    ...dbSettings,
  };

  return envSchema.safeParse(merged);
}

// Initial load
let parsed = loadConfig();

if (!parsed.success) {
  console.error('Environment validation failed:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

// Export mutable config object
export let config = parsed.data;

// Reload config from DB (call after updating settings)
export function reloadConfig() {
  const newParsed = loadConfig();
  if (newParsed.success) {
    config = newParsed.data;
    return true;
  }
  return false;
}

// Get config value dynamically (always fresh from DB for configurable settings)
export function getConfigValue(key) {
  const configurableKeys = ['DASH_USER', 'DASH_PASS', 'WEBHOOK_URL', 'WEBHOOK_TOKEN', 'API_TOKEN'];

  if (configurableKeys.includes(key)) {
    const dbSettings = getAllSettings();
    return dbSettings[key] || config[key];
  }

  return config[key];
}
