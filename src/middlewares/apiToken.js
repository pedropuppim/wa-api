import { getConfigValue } from '../config/env.js';

// API token validation middleware
export function requireApiToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      ok: false,
      error: 'Missing Authorization header',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      ok: false,
      error: 'Invalid Authorization header format. Expected: Bearer <token>',
    });
  }

  const token = parts[1];
  if (token !== getConfigValue('API_TOKEN')) {
    return res.status(403).json({
      ok: false,
      error: 'Invalid API token',
    });
  }

  next();
}
