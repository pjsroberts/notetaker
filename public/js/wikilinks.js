/* Client-side wiki link handling */
const WikiLinks = {
  /**
   * Convert [[target]] and [[target|display]] to anchor tags.
   * Runs BEFORE marked.parse() so marked doesn't interfere with the syntax.
   */
  preprocess(markdown) {
    // Split markdown into code and non-code segments to avoid
    // processing wiki links inside code blocks or inline code.
    const segments = [];
    let remaining = markdown;

    // Match fenced code blocks (```...```) and inline code (`...`)
    const codeRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(markdown)) !== null) {
      // Push text before this code segment
      if (match.index > lastIndex) {
        segments.push({ text: markdown.slice(lastIndex, match.index), isCode: false });
      }
      // Push the code segment as-is
      segments.push({ text: match[0], isCode: true });
      lastIndex = match.index + match[0].length;
    }
    // Push any remaining text after last code segment
    if (lastIndex < markdown.length) {
      segments.push({ text: markdown.slice(lastIndex), isCode: false });
    }

    // Only process wiki links in non-code segments
    return segments
      .map((seg) => {
        if (seg.isCode) return seg.text;
        return seg.text.replace(
          /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
          (match, target, display) => {
            const displayText = display || target;
            const safeTarget = target.trim().replace(/"/g, '&quot;');
            const safeDisplay = Utils.escapeHtml(displayText.trim());
            return `<a href="#" class="wiki-link" data-target="${safeTarget}">${safeDisplay}</a>`;
          }
        );
      })
      .join('');
  },

  /**
   * Navigate to a wiki link target.
   * Tries to find the note, or offers to create it.
   */
  async navigate(target) {
    const possiblePaths = [];

    // Try exact path
    if (target.endsWith('.md')) {
      possiblePaths.push(target);
    } else {
      possiblePaths.push(target + '.md');
    }

    // Also try as-is for paths without extension
    if (!target.endsWith('.md')) {
      possiblePaths.push(target);
    }

    for (const tryPath of possiblePaths) {
      try {
        const res = await fetch(`/api/file?path=${encodeURIComponent(tryPath)}`);
        if (res.ok) {
          App.openFile(tryPath);
          return;
        }
      } catch (e) {
        // continue trying
      }
    }

    // Try searching by basename across all files
    try {
      const res = await fetch('/api/files');
      const tree = await res.json();
      const allFiles = this.flattenTree(tree);
      const basename = target.endsWith('.md') ? target : target + '.md';

      const match = allFiles.find(
        (f) => f.split('/').pop() === basename || f.split('/').pop().toLowerCase() === basename.toLowerCase()
      );

      if (match) {
        App.openFile(match);
        return;
      }
    } catch (e) {
      // continue to creation prompt
    }

    // Note doesn't exist - offer to create it
    if (confirm(`Note "${target}" doesn't exist. Create it?`)) {
      const newPath = target.endsWith('.md') ? target : target + '.md';
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: newPath,
          content: `# ${Utils.stripExtension(Utils.basename(newPath))}\n\n`,
        }),
      });
      await Sidebar.refresh();
      App.openFile(newPath);
    }
  },

  /** Flatten a file tree into an array of file paths */
  flattenTree(node) {
    const results = [];
    if (node.type === 'file') {
      results.push(node.path);
    }
    if (node.children) {
      for (const child of node.children) {
        results.push(...this.flattenTree(child));
      }
    }
    return results;
  },
};
