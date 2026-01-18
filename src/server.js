import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { initializeClient, restartClient, regenerateQrCode } from './whatsapp/client.js';
import { requireAuth } from './middlewares/auth.js';
import { logger } from './utils/logger.js';

// Routes
import webRoutes from './routes/web.js';
import authRoutes from './routes/auth.js';
import statusRoutes from './routes/status.js';
import sendRoutes from './routes/send.js';
import settingsRoutes from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Trust proxy (for Cloudflare, nginx, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", "https://cloudflareinsights.com"],
      },
    },
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: { ok: false, error: 'Too many login attempts, please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Static files
app.use(express.static(join(__dirname, '../public')));

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/login', authLimiter);

// Mount routes
app.use(authRoutes);
app.use(webRoutes);
app.use(statusRoutes);
app.use(sendRoutes);
app.use(settingsRoutes);

// Restart WhatsApp endpoint (dashboard only)
app.post('/dashboard/restart', requireAuth, async (req, res) => {
  try {
    await restartClient();
    res.json({ ok: true, message: 'WhatsApp client restarting...' });
  } catch (err) {
    logger.error('Server', `Restart error: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Failed to restart WhatsApp client' });
  }
});

// Regenerate QR code endpoint (dashboard only)
app.post('/dashboard/regenerate-qr', requireAuth, async (req, res) => {
  try {
    await regenerateQrCode();
    res.json({ ok: true, message: 'QR code regenerating...' });
  } catch (err) {
    logger.error('Server', `Regenerate QR error: ${err.message}`);
    res.status(500).json({ ok: false, error: 'Failed to regenerate QR code' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server', `Unhandled error: ${err}`);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Not found',
  });
});

// Start server
const server = app.listen(config.APP_PORT, config.APP_HOST, () => {
  logger.log('Server', `Running on http://${config.APP_HOST}:${config.APP_PORT}`);

  // Initialize WhatsApp client
  initializeClient();
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.log('Server', 'Shutting down...');
  server.close(() => {
    logger.log('Server', 'HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.log('Server', 'Shutting down...');
  server.close(() => {
    logger.log('Server', 'HTTP server closed');
    process.exit(0);
  });
});
