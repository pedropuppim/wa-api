import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middlewares/auth.js';
import { getStatus, getQrCode, getPhoneInfo } from '../whatsapp/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Dashboard page (requires authentication)
router.get('/', requireAuth, (req, res) => {
  const dashboardPath = join(__dirname, '../../views/dashboard.html');
  const html = readFileSync(dashboardPath, 'utf-8');
  res.type('html').send(html);
});

// Settings page (requires authentication)
router.get('/settings', requireAuth, (req, res) => {
  const settingsPath = join(__dirname, '../../views/settings.html');
  const html = readFileSync(settingsPath, 'utf-8');
  res.type('html').send(html);
});

// Settings page (requires authentication)
router.get('/settings', requireAuth, (req, res) => {
  const settingsPath = join(__dirname, '../../views/settings.html');
  const html = readFileSync(settingsPath, 'utf-8');
  res.type('html').send(html);
});

// Paused contacts page (requires authentication)
router.get('/paused-contacts', requireAuth, (req, res) => {
  const pausedContactsPath = join(__dirname, '../../views/paused-contacts.html');
  const html = readFileSync(pausedContactsPath, 'utf-8');
  res.type('html').send(html);
});

// API docs page (requires authentication)
router.get('/api-docs', requireAuth, (req, res) => {
  const apiDocsPath = join(__dirname, '../../views/api-docs.html');
  const html = readFileSync(apiDocsPath, 'utf-8');
  res.type('html').send(html);
});

// Dashboard API - get WhatsApp status (for polling)
router.get('/dashboard/status', requireAuth, (req, res) => {
  const status = getStatus();
  const qrCode = getQrCode();
  const phoneInfo = getPhoneInfo();

  res.json({
    ...status,
    qrCode,
    phoneInfo,
  });
});

export default router;
