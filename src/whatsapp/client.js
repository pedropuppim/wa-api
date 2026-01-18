import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import { config } from '../config/env.js';
import { sendToWebhook } from '../services/webhook.js';
import { logger } from '../utils/logger.js';
import { pauseContact, getPauseDurationHours } from '../database/pausedContacts.js';
import { markApiSending, isApiSending } from '../utils/apiSendTracker.js';

// WhatsApp connection states
export const WA_STATUS = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  QR_REQUIRED: 'QR_REQUIRED',
  READY: 'READY',
};

// State management
let currentStatus = WA_STATUS.DISCONNECTED;
let qrCodeDataUrl = null;
let lastError = null;

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: config.WHATSAPP_CLIENT_ID,
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

// Event: QR Code received
client.on('qr', async (qr) => {
  logger.log('WhatsApp', 'QR Code received');
  currentStatus = WA_STATUS.QR_REQUIRED;
  try {
    qrCodeDataUrl = await qrcode.toDataURL(qr);
  } catch (err) {
    logger.error('WhatsApp', `Failed to generate QR code: ${err.message}`);
  }
});

// Event: Client is ready
client.on('ready', () => {
  logger.log('WhatsApp', 'Client is ready');
  currentStatus = WA_STATUS.READY;
  qrCodeDataUrl = null;
  lastError = null;
});

// Event: Authenticated
client.on('authenticated', () => {
  logger.log('WhatsApp', 'Authenticated');
  currentStatus = WA_STATUS.CONNECTING;
  qrCodeDataUrl = null;
});

// Event: Authentication failure
client.on('auth_failure', (msg) => {
  logger.error('WhatsApp', `Authentication failed: ${msg}`);
  currentStatus = WA_STATUS.DISCONNECTED;
  lastError = `Authentication failed: ${msg}`;
  qrCodeDataUrl = null;
});

// Event: Disconnected
client.on('disconnected', (reason) => {
  logger.log('WhatsApp', `Disconnected: ${reason}`);
  currentStatus = WA_STATUS.DISCONNECTED;
  lastError = `Disconnected: ${reason}`;
  qrCodeDataUrl = null;
});

// Event: Message received
client.on('message', async (msg) => {
  logger.log('WhatsApp', `Message received from ${msg.from}`);

  // Process message and send to webhook (non-blocking)
  sendToWebhook(msg, client).catch((err) => {
    logger.error('WhatsApp', `Failed to send webhook: ${err.message}`);
  });
});

// Event: Message created (sent from phone or API)
client.on('message_create', async (msg) => {
  // Only handle messages sent by us
  if (!msg.fromMe || !msg.id.fromMe) {
    return;
  }

  const chatId = msg.to;

  // Check if this message was sent via our API
  if (isApiSending(chatId)) {
    logger.log('WhatsApp', `API message sent to ${chatId} - not pausing`);
    return;
  }

  // Message was sent manually from phone - pause webhook
  const pauseHours = getPauseDurationHours();
  logger.log('WhatsApp', `Manual message sent to ${chatId} - pausing webhook for ${pauseHours}h`);
  pauseContact(chatId);
});

// Initialize client
export async function initializeClient() {
  logger.log('WhatsApp', 'Initializing client...');
  currentStatus = WA_STATUS.CONNECTING;

  try {
    await client.initialize();
  } catch (err) {
    logger.error('WhatsApp', `Failed to initialize: ${err.message}`);
    currentStatus = WA_STATUS.DISCONNECTED;
    lastError = `Initialization failed: ${err.message}`;
  }
}

// Restart client session
export async function restartClient() {
  logger.log('WhatsApp', 'Restarting client...');
  currentStatus = WA_STATUS.CONNECTING;
  lastError = null;
  qrCodeDataUrl = null;

  try {
    await client.destroy();
    await client.initialize();
  } catch (err) {
    logger.error('WhatsApp', `Failed to restart: ${err.message}`);
    currentStatus = WA_STATUS.DISCONNECTED;
    lastError = `Restart failed: ${err.message}`;
  }
}

// Regenerate QR code (logout and request new QR)
export async function regenerateQrCode() {
  logger.log('WhatsApp', 'Regenerating QR code...');
  currentStatus = WA_STATUS.CONNECTING;
  lastError = null;
  qrCodeDataUrl = null;

  try {
    await client.logout();
  } catch (err) {
    // If logout fails, try to destroy and reinitialize
    logger.warn('WhatsApp', `Logout failed, trying restart: ${err.message}`);
    try {
      await client.destroy();
      await client.initialize();
    } catch (reinitErr) {
      logger.error('WhatsApp', `Failed to regenerate QR: ${reinitErr.message}`);
      currentStatus = WA_STATUS.DISCONNECTED;
      lastError = `Failed to regenerate QR: ${reinitErr.message}`;
    }
  }
}

// Get current status
export function getStatus() {
  return {
    status: currentStatus,
    qrAvailable: qrCodeDataUrl !== null,
    lastError,
  };
}

// Get QR code data URL
export function getQrCode() {
  return qrCodeDataUrl;
}

// Check if client is ready
export function isReady() {
  return currentStatus === WA_STATUS.READY;
}

// Check if number is registered on WhatsApp
async function validateNumber(phone) {
  const chatId = formatChatId(phone);

  try {
    const numberId = await client.getNumberId(phone);
    if (numberId) {
      return numberId._serialized || chatId;
    }
  } catch (err) {
    // Validation failed, use formatted chatId
  }

  return chatId;
}

// Extract message ID safely from result
function extractMessageId(result) {
  if (result?.id?._serialized) {
    return result.id._serialized;
  }
  if (result?.id?.id) {
    return result.id.id;
  }
  if (typeof result?.id === 'string') {
    return result.id;
  }
  return `msg_${Date.now()}`;
}

// Send text message
export async function sendTextMessage(to, text) {
  const chatId = await validateNumber(to);
  markApiSending(chatId); // Mark BEFORE sending
  const result = await client.sendMessage(chatId, text);
  return {
    id: extractMessageId(result),
    to: chatId,
    type: 'text',
  };
}

// Send image message
export async function sendImageMessage(to, imageData, caption) {
  const chatId = await validateNumber(to);
  let media;

  if (imageData.source === 'url') {
    media = await MessageMedia.fromUrl(imageData.url);
  } else {
    media = new MessageMedia(imageData.mimetype, imageData.data, imageData.filename);
  }

  markApiSending(chatId); // Mark BEFORE sending
  const result = await client.sendMessage(chatId, media, { caption });
  return {
    id: extractMessageId(result),
    to: chatId,
    type: 'image',
  };
}

// Send audio message
export async function sendAudioMessage(to, audioData, asPtt = true) {
  const chatId = await validateNumber(to);
  let media;

  if (audioData.source === 'url') {
    media = await MessageMedia.fromUrl(audioData.url);
  } else {
    media = new MessageMedia(audioData.mimetype, audioData.data, audioData.filename);
  }

  markApiSending(chatId); // Mark BEFORE sending
  const result = await client.sendMessage(chatId, media, { sendAudioAsVoice: asPtt });
  return {
    id: extractMessageId(result),
    to: chatId,
    type: asPtt ? 'ptt' : 'audio',
  };
}

// Format phone number to WhatsApp chat ID
function formatChatId(phone) {
  // Remove non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  return `${cleaned}@c.us`;
}

export { client };
