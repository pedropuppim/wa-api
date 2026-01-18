import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConfigValue } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Login page
router.get('/login', (req, res) => {
  // If already authenticated, redirect to dashboard
  if (req.session && req.session.authenticated) {
    return res.redirect('/');
  }

  const loginPath = join(__dirname, '../../views/login.html');
  const html = readFileSync(loginPath, 'utf-8');
  res.type('html').send(html);
});

// Process login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username === getConfigValue('DASH_USER') && password === getConfigValue('DASH_PASS')) {
    req.session.authenticated = true;
    req.session.username = username;

    // For AJAX requests
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, redirect: '/' });
    }

    return res.redirect('/');
  }

  // For AJAX requests
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' });
  }

  // For form submissions, redirect back to login with error
  const loginPath = join(__dirname, '../../views/login.html');
  let html = readFileSync(loginPath, 'utf-8');
  html = html.replace('<!--ERROR-->', '<div class="error">Invalid credentials</div>');
  res.status(401).type('html').send(html);
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Auth', `Session destroy error: ${err.message}`);
    }

    // For AJAX requests
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ ok: true, redirect: '/login' });
    }

    res.redirect('/login');
  });
});

export default router;
