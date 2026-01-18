import { Router } from 'express';
import { requireApiToken } from '../middlewares/apiToken.js';
import { getStatus } from '../whatsapp/client.js';

const router = Router();

// GET /api/status - Get WhatsApp connection status
router.get('/api/status', requireApiToken, (req, res) => {
  const status = getStatus();
  res.json(status);
});

export default router;
