/**
 * Patch whatsapp-web.js to fix markedUnread error
 * See: https://github.com/pedroslopez/whatsapp-web.js/pull/5719
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const utilsPath = join(__dirname, '../node_modules/whatsapp-web.js/src/util/Injected/Utils.js');

try {
  let content = readFileSync(utilsPath, 'utf-8');

  if (content.includes('SendSeen.sendSeen')) {
    content = content.replace(
      'await window.Store.SendSeen.sendSeen(chat);',
      'await window.Store.SendSeen.markSeen(chat);'
    );
    writeFileSync(utilsPath, content);
    console.log('[Patch] whatsapp-web.js patched successfully (sendSeen -> markSeen)');
  } else if (content.includes('SendSeen.markSeen')) {
    console.log('[Patch] whatsapp-web.js already patched');
  } else {
    console.warn('[Patch] Could not find sendSeen method to patch');
  }
} catch (err) {
  console.error('[Patch] Failed to patch whatsapp-web.js:', err.message);
}
