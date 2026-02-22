const path = require('path');

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Extract all [[wiki links]] from markdown content.
 * Supports [[target]] and [[target|display text]].
 */
function extractWikiLinks(markdownContent) {
  const links = [];
  let match;
  const regex = new RegExp(WIKI_LINK_REGEX.source, 'g');
  while ((match = regex.exec(markdownContent)) !== null) {
    links.push({
      target: match[1].trim(),
      display: match[2] ? match[2].trim() : null,
      index: match.index,
    });
  }
  return links;
}

/**
 * Resolve a wiki link target to an actual file path.
 * Strategy (Obsidian-compatible):
 *   1. Exact match with .md extension
 *   2. Basename match across all directories
 *   3. Case-insensitive fallback
 */
function resolveWikiLink(linkTarget, allFiles) {
  const withExt = linkTarget.endsWith('.md') ? linkTarget : linkTarget + '.md';

  // Exact match
  if (allFiles.includes(withExt)) return withExt;

  // Basename match
  const basename = path.basename(withExt);
  const basenameMatch = allFiles.find((f) => path.basename(f) === basename);
  if (basenameMatch) return basenameMatch;

  // Case-insensitive
  const lower = withExt.toLowerCase();
  const ciMatch = allFiles.find((f) => f.toLowerCase() === lower);
  if (ciMatch) return ciMatch;

  return null;
}

module.exports = { extractWikiLinks, resolveWikiLink, WIKI_LINK_REGEX };
