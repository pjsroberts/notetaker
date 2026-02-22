/* CodeMirror editor wrapper with toolbar */
const Editor = {
  cm: null,
  saveTimeout: null,

  init() {
    this.cm = CodeMirror.fromTextArea(document.getElementById('editor-textarea'), {
      mode: 'gfm',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      styleActiveLine: true,
      extraKeys: {
        'Ctrl-B': () => this.toggleWrap('**'),
        'Cmd-B': () => this.toggleWrap('**'),
        'Ctrl-I': () => this.toggleWrap('*'),
        'Cmd-I': () => this.toggleWrap('*'),
        'Ctrl-K': () => this.insertLink(),
        'Cmd-K': () => this.insertLink(),
        'Ctrl-Shift-K': () => this.insertWikiLink(),
        'Cmd-Shift-K': () => this.insertWikiLink(),
        Tab: (cm) => {
          if (cm.somethingSelected()) {
            cm.execCommand('indentMore');
          } else {
            cm.replaceSelection('  ', 'end');
          }
        },
        'Shift-Tab': (cm) => cm.execCommand('indentLess'),
      },
    });

    // Sync to preview on change (debounced)
    this.cm.on(
      'change',
      Utils.debounce(() => {
        App.state.isDirty = true;
        App.updateSaveIndicator();
        Preview.render(this.cm.getValue());
      }, 150)
    );

    // Auto-save after 2 seconds of inactivity
    this.cm.on('change', () => {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => App.saveCurrentFile(), 2000);
    });

    this.buildToolbar();
  },

  buildToolbar() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = '';

    const buttons = [
      { icon: 'B', title: 'Bold (Ctrl+B)', action: () => this.toggleWrap('**'), style: 'font-weight:800' },
      { icon: 'I', title: 'Italic (Ctrl+I)', action: () => this.toggleWrap('*'), style: 'font-style:italic' },
      { icon: 'S', title: 'Strikethrough', action: () => this.toggleWrap('~~'), style: 'text-decoration:line-through' },
      { type: 'separator' },
      { icon: 'H1', title: 'Heading 1', action: () => this.toggleLinePrefix('# ') },
      { icon: 'H2', title: 'Heading 2', action: () => this.toggleLinePrefix('## ') },
      { icon: 'H3', title: 'Heading 3', action: () => this.toggleLinePrefix('### ') },
      { type: 'separator' },
      { icon: '\u2022', title: 'Bullet List', action: () => this.toggleLinePrefix('- ') },
      { icon: '1.', title: 'Numbered List', action: () => this.toggleLinePrefix('1. ') },
      { icon: '\u2610', title: 'Task List', action: () => this.toggleLinePrefix('- [ ] ') },
      { icon: '\u201C', title: 'Blockquote', action: () => this.toggleLinePrefix('> ') },
      { type: 'separator' },
      { icon: '< >', title: 'Inline Code', action: () => this.toggleWrap('`') },
      { icon: '```', title: 'Code Block', action: () => this.insertCodeBlock() },
      { icon: '[[]]', title: 'Wiki Link (Ctrl+Shift+K)', action: () => this.insertWikiLink() },
      { icon: '\u{1F517}', title: 'Link (Ctrl+K)', action: () => this.insertLink() },
      { icon: '\u2015', title: 'Horizontal Rule', action: () => this.insertAtCursor('\n---\n') },
    ];

    for (const btn of buttons) {
      if (btn.type === 'separator') {
        const sep = document.createElement('span');
        sep.className = 'toolbar-separator';
        toolbar.appendChild(sep);
        continue;
      }

      const el = document.createElement('button');
      el.className = 'toolbar-btn';
      el.textContent = btn.icon;
      el.title = btn.title;
      if (btn.style) el.style.cssText += btn.style;
      el.addEventListener('click', (e) => {
        e.preventDefault();
        btn.action();
        this.cm.focus();
      });
      toolbar.appendChild(el);
    }

    // Filename display
    const filenameEl = document.createElement('span');
    filenameEl.className = 'toolbar-filename';
    filenameEl.id = 'toolbar-filename';
    toolbar.appendChild(filenameEl);

    // Save indicator
    const saveEl = document.createElement('span');
    saveEl.className = 'save-indicator saved';
    saveEl.id = 'save-indicator';
    saveEl.textContent = '';
    toolbar.appendChild(saveEl);

    // View mode toggle buttons
    const viewContainer = document.createElement('div');
    viewContainer.className = 'toolbar-views';

    const modes = [
      { id: 'split', icon: '\u2261', title: 'Split View' },
      { id: 'editor', icon: '\u270E', title: 'Editor Only' },
      { id: 'preview', icon: '\u{1F441}', title: 'Preview Only' },
    ];

    for (const mode of modes) {
      const el = document.createElement('button');
      el.className = 'toolbar-btn view-btn';
      if (mode.id === 'split') el.classList.add('active');
      el.textContent = mode.icon;
      el.title = mode.title;
      el.dataset.mode = mode.id;
      el.addEventListener('click', () => {
        this.setViewMode(mode.id);
        viewContainer.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
        el.classList.add('active');
      });
      viewContainer.appendChild(el);
    }

    toolbar.appendChild(viewContainer);
  },

  toggleWrap(marker) {
    const sel = this.cm.getSelection();
    if (sel.startsWith(marker) && sel.endsWith(marker) && sel.length >= marker.length * 2) {
      this.cm.replaceSelection(sel.slice(marker.length, -marker.length));
    } else {
      this.cm.replaceSelection(marker + (sel || 'text') + marker);
    }
  },

  toggleLinePrefix(prefix) {
    const cursor = this.cm.getCursor();
    const line = this.cm.getLine(cursor.line);

    if (line.startsWith(prefix)) {
      this.cm.replaceRange(line.slice(prefix.length), { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    } else {
      // Remove any existing prefix first
      const cleaned = line.replace(/^#{1,6}\s|^[-*+]\s|^\d+\.\s|^>\s|^- \[[ x]\]\s/, '');
      this.cm.replaceRange(prefix + cleaned, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
    }
  },

  insertWikiLink() {
    const sel = this.cm.getSelection();
    if (sel) {
      this.cm.replaceSelection(`[[${sel}]]`);
    } else {
      const cursor = this.cm.getCursor();
      this.cm.replaceRange('[[]]', cursor);
      this.cm.setCursor({ line: cursor.line, ch: cursor.ch + 2 });
    }
  },

  insertLink() {
    const sel = this.cm.getSelection();
    const url = prompt('URL:');
    if (url !== null) {
      this.cm.replaceSelection(`[${sel || 'link text'}](${url})`);
    }
  },

  insertCodeBlock() {
    const sel = this.cm.getSelection();
    const lang = prompt('Language (optional):') || '';
    this.cm.replaceSelection('\n```' + lang + '\n' + (sel || '') + '\n```\n');
  },

  insertAtCursor(text) {
    this.cm.replaceSelection(text);
  },

  setValue(content) {
    this.cm.setValue(content);
    this.cm.clearHistory();
    this.cm.focus();
  },

  getValue() {
    return this.cm.getValue();
  },

  setViewMode(mode) {
    App.state.editorMode = mode;
    const container = document.getElementById('editor-container');
    container.className = `view-mode-${mode}`;
    // Refresh CodeMirror when switching to editor mode
    if (mode !== 'preview') {
      setTimeout(() => this.cm.refresh(), 10);
    }
  },
};
