// Track chats where API is sending (to distinguish from manual phone messages)
const apiSendingToChats = new Map(); // chatId -> timestamp
const API_SEND_WINDOW_MS = 10000; // 10 seconds window

export function markApiSending(chatId) {
  apiSendingToChats.set(chatId, Date.now());
  // Auto-cleanup after 10 seconds
  setTimeout(() => {
    apiSendingToChats.delete(chatId);
  }, API_SEND_WINDOW_MS);
}

export function isApiSending(chatId) {
  const timestamp = apiSendingToChats.get(chatId);
  if (!timestamp) return false;

  // Check if within the time window
  if (Date.now() - timestamp < API_SEND_WINDOW_MS) {
    apiSendingToChats.delete(chatId); // Consume the flag
    return true;
  }
  return false;
}
