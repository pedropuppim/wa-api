# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp Web API server built with Node.js/Express. Provides REST API for sending WhatsApp messages (text, images, audio), web dashboard for connection management, webhook system for receiving messages, and auto-reply functionality.

**Tech Stack:** Node.js 22+, Express.js, SQLite (better-sqlite3), whatsapp-web.js, Zod validation

## Commands

```bash
npm run dev           # Development with hot reload (--watch)
npm start             # Production single instance
npm run prod          # PM2 production startup
npm run prod:stop     # Stop PM2
npm run prod:restart  # Restart PM2
npm run prod:logs     # View PM2 logs
```

## Architecture

### Request Flow
1. API requests → `apiToken.js` middleware (Bearer token) → route handlers
2. Dashboard requests → `auth.js` middleware (session) → route handlers
3. Incoming WhatsApp messages → `webhook.js` service → external webhook URL

### Key Modules

- **`src/whatsapp/client.js`** - WhatsApp connection wrapper. Manages client state (DISCONNECTED, CONNECTING, QR_REQUIRED, READY), handles message sending, emits events for incoming messages.

- **`src/config/env.js`** - Zod-validated config. Merges `.env` with database settings. Call `reloadConfig()` after DB setting changes.

- **`src/services/webhook.js`** - Builds webhook payloads, sends with retry logic (3 attempts, exponential backoff), handles auto-reply with 12h per-contact cooldown.

- **`src/database/`** - SQLite operations. `settings.js` for config CRUD, `pausedContacts.js` for manual takeover tracking, `autoReply.js` for cooldown tracking.

### Database Tables (SQLite)

- `settings` - Key-value config store (overrides .env)
- `paused_contacts` - Tracks contacts with paused webhooks (manual takeover mode)
- `auto_reply_log` - Per-contact auto-reply cooldown timestamps

### Special Features

**Paused Contacts (Manual Takeover):** When user sends message from phone, webhook is paused for that contact (default 4h). API sends tracked via `apiSendTracker.js` to avoid false pauses.

**Auto-Reply:** Configurable auto-response with 12h per-contact cooldown. Only for 1-on-1 chats.

## API Endpoints

**Dashboard (session auth):**
- `GET/POST /login`, `POST /logout`
- `GET /` - Dashboard, `GET /settings` - Settings page
- `GET/POST /dashboard/settings` - Settings API
- `POST /dashboard/restart`, `POST /dashboard/regenerate-qr`

**API (Bearer token):**
- `GET /api/status` - Connection status
- `POST /api/send` - Send message (text/image/audio)
- `GET/POST/DELETE /api/paused-contacts` - Manage paused contacts

## Message Payload Examples

```json
// Text
{"to": "5511999999999", "type": "text", "text": "Hello"}

// Image URL
{"to": "5511999999999", "type": "image", "caption": "optional", "image": {"source": "url", "url": "https://..."}}

// Audio
{"to": "5511999999999", "type": "audio", "audio": {"source": "url", "url": "https://..."}, "asPtt": true}
```

## Important Files

| File | Purpose |
|------|---------|
| `src/server.js` | Express setup, middleware, routes |
| `src/whatsapp/client.js` | WhatsApp connection & message logic |
| `src/config/env.js` | Config validation & dynamic reload |
| `src/services/webhook.js` | Webhook sending & auto-reply |
| `src/validators/sendMessage.validator.js` | Zod schemas for /api/send |

## Session Storage

- `.wwebjs_auth/` - WhatsApp authentication data
- `.wwebjs_cache/` - WhatsApp web cache
- `data/settings.db` - SQLite database
