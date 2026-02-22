const path = require('path');

const NOTES_DIR = path.join(__dirname, '..', 'notes');

/**
 * Resolve a user-provided relative path to an absolute path within NOTES_DIR.
 * Returns null if the path escapes the notes directory (directory traversal prevention).
 */
function resolveNotePath(userPath) {
  if (!userPath) return null;
  // Normalize separators and resolve
  const normalized = path.normalize(userPath.replace(/\\/g, '/'));
  const resolved = path.resolve(NOTES_DIR, normalized);
  // Must be within NOTES_DIR
  if (!resolved.startsWith(NOTES_DIR + path.sep) && resolved !== NOTES_DIR) {
    return null;
  }
  return resolved;
}

/**
 * Convert an absolute path back to a relative path using forward slashes.
 */
function toRelativePath(absolutePath) {
  return path.relative(NOTES_DIR, absolutePath).replace(/\\/g, '/');
}

/**
 * Get all .md files recursively from NOTES_DIR.
 * Returns array of relative paths with forward slashes.
 */
function getAllMarkdownFiles(dir = NOTES_DIR) {
  const fs = require('fs');
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(toRelativePath(fullPath));
      }
    }
  }

  walk(dir);
  return results;
}

module.exports = { NOTES_DIR, resolveNotePath, toRelativePath, getAllMarkdownFiles };
