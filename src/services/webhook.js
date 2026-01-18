import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { isContactPaused } from '../database/pausedContacts.js';

// Send message to webhook
export async function sendToWebhook(msg, client) {
  try {
    // Check if contact is paused (manual takeover)
    const chatId = msg.from;
    if (isContactPaused(chatId)) {
      logger.log('Webhook', `Skipping - contact ${chatId} is paused (manual takeover)`);
      return;
    }

    // Get contact info
    const contact = await msg.getContact();

    // Build base payload
    const payload = {
      event: 'message.received',
      timestamp: new Date().toISOString(),
      instance: config.WHATSAPP_CLIENT_ID,
      message: {
        id: msg.id._serialized,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        type: msg.type,
        hasMedia: msg.hasMedia,
        isGroup: msg.from.endsWith('@g.us'),
        chatId: msg.from,
      },
      contact: {
        name: contact.name || contact.pushname || 'Unknown',
        pushname: contact.pushname || '',
        number: msg.from.replace('@c.us', '').replace('@g.us', ''),
      },
    };

    // Handle media asynchronously (don't block webhook sending)
    if (msg.hasMedia) {
      processMediaAsync(msg, payload);
    }

    // Send to webhook
    await sendWebhookRequest(payload);
  } catch (err) {
    logger.error('Webhook', `Error processing message: ${err.message}`);
    throw err;
  }
}

// Process media in background (non-blocking)
async function processMediaAsync(msg, payload) {
  try {
    const media = await msg.downloadMedia();
    if (media) {
      payload.media = {
        mimetype: media.mimetype,
        filename: media.filename || null,
        base64: media.data,
      };

      // Send updated payload with media
      await sendWebhookRequest({ ...payload, event: 'message.media' });
    }
  } catch (err) {
    logger.error('Webhook', `Error downloading media: ${err.message}`);
  }
}

// Send HTTP POST to webhook
async function sendWebhookRequest(payload, retries = 3) {
  const maxRetries = retries;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(config.WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.WEBHOOK_TOKEN}`,
        },
        timeout: 10000,
      });

      logger.log('Webhook', `Sent successfully (status: ${response.status})`);
      return response;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        logger.error('Webhook', `Failed after ${maxRetries} attempts: ${err.message}`);
        throw err;
      }

      logger.warn('Webhook', `Attempt ${attempt} failed, retrying...`);
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
