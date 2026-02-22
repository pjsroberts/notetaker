const fs = require('fs');
const path = require('path');

/**
 * Watch the notes directory for file changes and broadcast events.
 * Uses fs.watch with recursive option on Windows/macOS.
 * Falls back to per-directory watching on Linux/Termux.
 */
function startWatcher(notesDir, broadcast) {
  const debounceMap = new Map();
  const DEBOUNCE_MS = 300;

  function handleEvent(eventType, filename) {
    if (!filename) return;
    // Normalize separators
    const normalized = filename.replace(/\\/g, '/');
    // Only care about markdown files or directory changes
    if (!normalized.endsWith('.md') && eventType !== 'rename') return;

    const key = normalized;
    if (debounceMap.has(key)) clearTimeout(debounceMap.get(key));

    debounceMap.set(
      key,
      setTimeout(() => {
        debounceMap.delete(key);
        const fullPath = path.join(notesDir, normalized);
        const exists = fs.existsSync(fullPath);

        if (normalized.endsWith('.md')) {
          broadcast({
            type: exists ? 'file-changed' : 'file-deleted',
            path: normalized,
          });
        } else {
          // Directory change - broadcast a generic refresh
          broadcast({ type: 'refresh' });
        }
      }, DEBOUNCE_MS)
    );
  }

  try {
    // Try recursive watch (Windows, macOS)
    fs.watch(notesDir, { recursive: true }, handleEvent);
    console.log('File watcher started (recursive mode)');
  } catch (err) {
    // Fallback for Linux/Termux: watch each directory individually
    console.log('File watcher started (per-directory fallback)');
    watchDirectoryTree(notesDir, notesDir, handleEvent);
  }
}

function watchDirectoryTree(baseDir, dir, handler) {
  try {
    fs.watch(dir, (eventType, filename) => {
      if (filename) {
        const relative = path.relative(baseDir, path.join(dir, filename));
        handler(eventType, relative);
      }
    });
  } catch (err) {
    // Ignore errors for individual directories
  }

  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        watchDirectoryTree(baseDir, path.join(dir, entry.name), handler);
      }
    }
  } catch (err) {
    // Ignore read errors
  }
}

module.exports = { startWatcher };
