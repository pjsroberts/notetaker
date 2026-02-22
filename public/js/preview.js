/* Markdown preview renderer */
const Preview = {
  container: null,

  init() {
    this.container = document.getElementById('preview-content');

    // Configure marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(code, { language: lang }).value;
          } catch (e) {
            // fallback
          }
        }
        try {
          return hljs.highlightAuto(code).value;
        } catch (e) {
          return code;
        }
      },
    });

    this.initDividerResize();
  },

  render(markdown) {
    if (!markdown) {
      this.container.innerHTML = '';
      return;
    }

    // Pre-process wiki links before marked parses
    const processed = WikiLinks.preprocess(markdown);

    // Parse with marked
    this.container.innerHTML = marked.parse(processed);

    // Make wiki links clickable
    this.container.querySelectorAll('a.wiki-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.target;
        WikiLinks.navigate(target);
      });
    });

    // Make task list checkboxes functional
    this.container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        this.toggleCheckbox(checkbox);
      });
    });

    // Load backlinks
    if (App.state.currentFile) {
      this.loadBacklinks(App.state.currentFile);
    }
  },

  toggleCheckbox(checkbox) {
    // Find the checkbox's line in the editor and toggle it
    const listItem = checkbox.closest('li');
    if (!listItem) return;

    const text = listItem.textContent.trim();
    const content = Editor.getValue();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (checkbox.checked && line.includes('- [ ]') && line.includes(text.substring(0, 20))) {
        lines[i] = line.replace('- [ ]', '- [x]');
        Editor.cm.setValue(lines.join('\n'));
        App.state.isDirty = true;
        App.saveCurrentFile();
        return;
      } else if (!checkbox.checked && line.includes('- [x]') && line.includes(text.substring(0, 20))) {
        lines[i] = line.replace('- [x]', '- [ ]');
        Editor.cm.setValue(lines.join('\n'));
        App.state.isDirty = true;
        App.saveCurrentFile();
        return;
      }
    }
  },

  async loadBacklinks(filePath) {
    try {
      const res = await fetch(`/api/backlinks?path=${encodeURIComponent(filePath)}`);
      const backlinks = await res.json();

      if (backlinks.length === 0) return;

      const panel = document.createElement('div');
      panel.className = 'backlinks-panel';
      panel.innerHTML = `<div class="backlinks-title">Backlinks (${backlinks.length})</div>`;

      for (const bl of backlinks) {
        const item = document.createElement('div');
        item.className = 'backlink-item';
        item.innerHTML = `${Utils.escapeHtml(Utils.stripExtension(Utils.basename(bl.path)))}
                          <span class="backlink-context">${Utils.escapeHtml(bl.context.substring(0, 80))}</span>`;
        item.addEventListener('click', () => App.openFile(bl.path));
        panel.appendChild(item);
      }

      this.container.appendChild(panel);
    } catch (e) {
      // ignore backlink errors
    }
  },

  initDividerResize() {
    const divider = document.getElementById('divider');
    const editorPane = document.getElementById('editor-pane');
    const previewPane = document.getElementById('preview-pane');
    let isResizing = false;

    divider.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const container = document.getElementById('editor-container');
      const containerRect = container.getBoundingClientRect();
      const ratio = (e.clientX - containerRect.left) / containerRect.width;
      const clampedRatio = Math.min(Math.max(ratio, 0.2), 0.8);

      editorPane.style.flex = `${clampedRatio}`;
      previewPane.style.flex = `${1 - clampedRatio}`;

      Editor.cm.refresh();
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  },
};
