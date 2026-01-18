import { Router } from 'express';
import { requireApiToken } from '../middlewares/apiToken.js';
import { validateSendMessage } from '../validators/sendMessage.validator.js';
import {
  isReady,
  sendTextMessage,
  sendImageMessage,
  sendAudioMessage,
} from '../whatsapp/client.js';

const router = Router();

// POST /api/send - Send a message
router.post('/api/send', requireApiToken, async (req, res) => {
  // Check if WhatsApp is ready
  if (!isReady()) {
    return res.status(409).json({
      ok: false,
      error: 'WhatsApp is not connected. Current status is not READY.',
    });
  }

  // Validate payload
  const validation = validateSendMessage(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: validation.errors,
    });
  }

  const payload = validation.data;

  try {
    let result;

    switch (payload.type) {
      case 'text':
        result = await sendTextMessage(payload.to, payload.text);
        break;

      case 'image':
        result = await sendImageMessage(payload.to, payload.image, payload.caption);
        break;

      case 'audio':
        result = await sendAudioMessage(payload.to, payload.audio, payload.asPtt);
        break;

      default:
        return res.status(400).json({
          ok: false,
          error: `Unsupported message type: ${payload.type}`,
        });
    }

    res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error('[Send] Error sending message:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Failed to send message',
      details: err.message,
    });
  }
});

export default router;
