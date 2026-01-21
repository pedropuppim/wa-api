import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { isContactPaused } from '../database/pausedContacts.js';
import { getSetting, SETTINGS_DEFAULTS } from '../database/settings.js';
import { canSendAutoReply, recordAutoReply } from '../database/autoReply.js';
import { markApiSending } from '../utils/apiSendTracker.js';

// Check if webhook is enabled
function isWebhookEnabled() {
  const value = getSetting('WEBHOOK_ENABLED');
  if (value === null) return SETTINGS_DEFAULTS.WEBHOOK_ENABLED;
  return value === 'true' || value === '1';
}

// Check if auto-reply is enabled
function isAutoReplyEnabled() {
  const value = getSetting('AUTO_REPLY_ENABLED');
  if (value === null) return SETTINGS_DEFAULTS.AUTO_REPLY_ENABLED;
  return value === 'true' || value === '1';
}

// Get auto-reply message
function getAutoReplyMessage() {
  return getSetting('AUTO_REPLY_MESSAGE') || SETTINGS_DEFAULTS.AUTO_REPLY_MESSAGE;
}

// Send message to webhook
export async function sendToWebhook(msg, client) {
  try {
    // Check if contact is paused (manual takeover)
    const chatId = msg.from;
    if (isContactPaused(chatId)) {
      logger.log('Webhook', `Skipping - contact ${chatId} is paused (manual takeover)`);
      return;
    }

    // Handle auto-reply if enabled
    await handleAutoReply(msg, client);

    // Check if webhook is enabled
    if (!isWebhookEnabled()) {
      logger.log('Webhook', `Webhook disabled - skipping for ${chatId}`);
      return;
    }

    // Get contact info
    const contact = await msg.getContact();
    const phoneNumber = contact.number || contact.id?.user || null;

    // Log with actual phone number when available
    if (phoneNumber && chatId.includes('@lid')) {
      logger.log('Webhook', `LID resolved: ${chatId} -> ${phoneNumber}`);
    }

    // Extract phone number - handle LID format (@lid) and regular format (@c.us)
    const extractNumber = () => {
      // Try to get from contact.number first (most reliable)
      if (contact.number) {
        return contact.number;
      }
      // Try contact.id.user
      if (contact.id?.user) {
        return contact.id.user;
      }
      // Fallback: extract from msg.from removing any suffix
      return msg.from.replace(/@.*$/, '');
    };

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
        number: extractNumber(),
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

// Handle auto-reply logic
async function handleAutoReply(msg, client) {
  try {
    // Skip if auto-reply is disabled
    if (!isAutoReplyEnabled()) {
      return;
    }

    // Skip groups
    if (msg.from.endsWith('@g.us')) {
      return;
    }

    const chatId = msg.from;
    const autoReplyMessage = getAutoReplyMessage();

    // Skip if no message configured
    if (!autoReplyMessage) {
      return;
    }

    // Check if we can send auto-reply (12h cooldown)
    if (!canSendAutoReply(chatId)) {
      logger.log('AutoReply', `Cooldown active for ${chatId} - skipping`);
      return;
    }

    // Mark as API sending to prevent pause trigger
    markApiSending(chatId);

    // Send auto-reply
    await client.sendMessage(chatId, autoReplyMessage);
    recordAutoReply(chatId);

    logger.log('AutoReply', `Sent auto-reply to ${chatId}`);
  } catch (err) {
    logger.error('AutoReply', `Error sending auto-reply: ${err.message}`);
  }
}
