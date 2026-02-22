const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const apiRouter = require('./lib/api');
const { startWatcher } = require('./lib/watcher');
const { NOTES_DIR } = require('./lib/file-utils');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Ensure notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

// Create default welcome note if notes dir has no .md files
const welcomePath = path.join(NOTES_DIR, 'welcome.md');
const existingNotes = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md'));
if (existingNotes.length === 0) {
  fs.writeFileSync(
    welcomePath,
    '# Welcome to Notetaker\n\nYour local-first note-taking app. Click the **+** button in the sidebar to create a new note, or start editing this one.\n\n## Quick Start\n\n- **Ctrl+N** - New note\n- **Ctrl+S** - Save\n- **Ctrl+P** - Search\n- **Ctrl+B** - Bold\n- **Ctrl+I** - Italic\n\nLink between notes with [[wiki links]]. Happy writing!\n',
    'utf-8'
  );
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRouter);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connections
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected' }));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(msg);
    }
  });
}

// File watcher
startWatcher(NOTES_DIR, broadcast);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Notetaker is running!\n`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}\n`);
});
