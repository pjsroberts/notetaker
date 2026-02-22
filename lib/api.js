const express = require('express');
const fs = require('fs');
const path = require('path');
const { NOTES_DIR, resolveNotePath, toRelativePath, getAllMarkdownFiles } = require('./file-utils');
const { extractWikiLinks, resolveWikiLink } = require('./wiki-links');

const router = express.Router();

// GET /api/files - list all files/folders as a tree
router.get('/files', (req, res) => {
  try {
    const tree = buildTree(NOTES_DIR);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file tree' });
  }
});

function buildTree(dir) {
  const name = path.basename(dir);
  const relativePath = toRelativePath(dir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const children = [];

  // Directories first, then files, both alphabetically
  const dirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const d of dirs) {
    children.push(buildTree(path.join(dir, d.name)));
  }

  for (const f of files) {
    const filePath = toRelativePath(path.join(dir, f.name));
    children.push({
      name: f.name,
      type: 'file',
      path: filePath,
    });
  }

  return {
    name,
    type: 'directory',
    path: relativePath || '',
    children,
  };
}

// GET /api/file?path=... - read a single note
router.get('/file', (req, res) => {
  const filePath = resolveNotePath(req.query.path);
  if (!filePath) return res.status(400).json({ error: 'Invalid path' });

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);
    res.json({ content, modified: stats.mtime });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// POST /api/file - create a new note
router.post('/file', (req, res) => {
  const { path: notePath, content } = req.body;
  if (!notePath) return res.status(400).json({ error: 'Path is required' });

  const filePath = resolveNotePath(notePath);
  if (!filePath) return res.status(400).json({ error: 'Invalid path' });

  if (fs.existsSync(filePath)) {
    return res.status(409).json({ error: 'File already exists' });
  }

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content || '', 'utf-8');
  res.json({ success: true, path: notePath });
});

// PUT /api/file - update a note's content
router.put('/file', (req, res) => {
  const { path: notePath, content } = req.body;
  if (!notePath) return res.status(400).json({ error: 'Path is required' });

  const filePath = resolveNotePath(notePath);
  if (!filePath) return res.status(400).json({ error: 'Invalid path' });

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content || '', 'utf-8');
  res.json({ success: true });
});

// DELETE /api/file?path=... - delete a note
router.delete('/file', (req, res) => {
  const filePath = resolveNotePath(req.query.path);
  if (!filePath) return res.status(400).json({ error: 'Invalid path' });

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// POST /api/folder - create a new folder
router.post('/folder', (req, res) => {
  const { path: folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'Path is required' });

  const fullPath = resolveNotePath(folderPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  fs.mkdirSync(fullPath, { recursive: true });
  res.json({ success: true });
});

// DELETE /api/folder?path=... - delete an empty folder
router.delete('/folder', (req, res) => {
  const fullPath = resolveNotePath(req.query.path);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  try {
    fs.rmdirSync(fullPath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Folder not empty or not found' });
  }
});

// POST /api/rename - rename/move a file
router.post('/rename', (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ error: 'Both oldPath and newPath are required' });

  const resolvedOld = resolveNotePath(oldPath);
  const resolvedNew = resolveNotePath(newPath);
  if (!resolvedOld || !resolvedNew) return res.status(400).json({ error: 'Invalid path' });

  if (!fs.existsSync(resolvedOld)) {
    return res.status(404).json({ error: 'Source file not found' });
  }

  // Ensure target parent directory exists
  fs.mkdirSync(path.dirname(resolvedNew), { recursive: true });
  fs.renameSync(resolvedOld, resolvedNew);
  res.json({ success: true });
});

// GET /api/search?q=... - full-text search across all notes
router.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 1) return res.json([]);

  try {
    const allFiles = getAllMarkdownFiles();
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const filePath of allFiles) {
      const fullPath = resolveNotePath(filePath);
      if (!fullPath) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lowerContent = content.toLowerCase();
      const idx = lowerContent.indexOf(lowerQuery);

      if (idx !== -1) {
        // Extract a snippet around the match
        const start = Math.max(0, idx - 40);
        const end = Math.min(content.length, idx + query.length + 40);
        let snippet = content.substring(start, end).replace(/\n/g, ' ');
        if (start > 0) snippet = '...' + snippet;
        if (end < content.length) snippet = snippet + '...';

        results.push({ path: filePath, snippet });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/backlinks?path=... - find all notes that link to the given note
router.get('/backlinks', (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Path is required' });

  try {
    const allFiles = getAllMarkdownFiles();
    const results = [];

    // The target can be referenced by its full path or just its basename (without .md)
    const targetBasename = path.basename(targetPath, '.md');

    for (const filePath of allFiles) {
      if (filePath === targetPath) continue;

      const fullPath = resolveNotePath(filePath);
      if (!fullPath) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const links = extractWikiLinks(content);

      for (const link of links) {
        const resolved = resolveWikiLink(link.target, allFiles);
        if (resolved === targetPath || link.target === targetBasename) {
          // Find the line containing this link for context
          const lines = content.split('\n');
          let contextLine = '';
          let pos = 0;
          for (const line of lines) {
            if (pos <= link.index && link.index < pos + line.length + 1) {
              contextLine = line.trim();
              break;
            }
            pos += line.length + 1;
          }

          results.push({ path: filePath, context: contextLine });
          break; // One entry per file
        }
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Backlink search failed' });
  }
});

module.exports = router;
