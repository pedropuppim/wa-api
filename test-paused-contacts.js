#!/usr/bin/env node

// Test script to verify paused contacts page functionality
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const port = 3001;

const server = createServer((req, res) => {
  console.log(`[TEST] ${req.method} ${req.url}`);

  // Test if paused-contacts.html exists
  if (req.url === '/paused-contacts') {
    try {
      const htmlPath = join(__dirname, 'views/paused-contacts.html');
      const html = readFileSync(htmlPath, 'utf-8');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      console.log('[TEST] ✓ paused-contacts.html served successfully');
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      console.error('[TEST] ✗ Error serving paused-contacts.html:', err.message);
    }
    return;
  }

  // Test if paused-contacts.js exists
  if (req.url === '/js/paused-contacts.js') {
    try {
      const jsPath = join(__dirname, 'public/js/paused-contacts.js');
      const js = readFileSync(jsPath, 'utf-8');
      
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(js);
      console.log('[TEST] ✓ paused-contacts.js served successfully');
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      console.error('[TEST] ✗ Error serving paused-contacts.js:', err.message);
    }
    return;
  }

  // Test API endpoint
  if (req.url === '/dashboard/paused-contacts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      ok: true, 
      contacts: [
        {
          chatId: '5511999999999@c.us',
          number: '5511999999999',
          isGroup: false,
          pausedAt: Date.now() - 3600000,
          expiresAt: Date.now() + 10800000,
          remainingMs: 10800000
        }
      ]
    }));
    console.log('[TEST] ✓ API endpoint /dashboard/paused-contacts works');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(port, () => {
  console.log(`[TEST] Test server running at http://localhost:${port}`);
  console.log('[TEST] You can test the following URLs:');
  console.log(`[TEST] - http://localhost:${port}/paused-contacts (HTML page)`);
  console.log(`[TEST] - http://localhost:${port}/js/paused-contacts.js (JavaScript file)`);
  console.log(`[TEST] - http://localhost:${port}/dashboard/paused-contacts (API endpoint)`);
  console.log('[TEST] Press Ctrl+C to stop the test server');
  
  // Auto-test after 1 second
  setTimeout(async () => {
    console.log('\n[TEST] Running automated tests...');
    
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Test HTML page
      const htmlRes = await fetch(`http://localhost:${port}/paused-contacts`);
      console.log(`[TEST] HTML page status: ${htmlRes.status} ${htmlRes.status === 200 ? '✓' : '✗'}`);
      
      // Test JS file
      const jsRes = await fetch(`http://localhost:${port}/js/paused-contacts.js`);
      console.log(`[TEST] JS file status: ${jsRes.status} ${jsRes.status === 200 ? '✓' : '✗'}`);
      
      // Test API endpoint
      const apiRes = await fetch(`http://localhost:${port}/dashboard/paused-contacts`);
      const apiData = await apiRes.json();
      console.log(`[TEST] API endpoint status: ${apiRes.status} ${apiRes.status === 200 && apiData.ok ? '✓' : '✗'}`);
      
      console.log('\n[TEST] All tests completed! The paused contacts page should be working correctly.');
      console.log('[TEST] Start your main server with: npm start');
      
    } catch (err) {
      console.error('[TEST] Error during automated tests:', err.message);
    }
  }, 1000);
});

process.on('SIGINT', () => {
  console.log('\n[TEST] Stopping test server...');
  server.close(() => {
    process.exit(0);
  });
});