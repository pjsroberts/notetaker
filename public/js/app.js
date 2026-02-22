/* Main application logic */
const App = {
  state: {
    currentFile: null,
    files: [],
    isDirty: false,
    editorMode: 'split',
  },

  async init() {
    await Sidebar.init();
    Editor.init();
    Preview.init();
    WebSocketClient.init();
    this.bindGlobalKeys();
    this.loadLastOpenFile();
  },

  async openFile(filePath) {
    // Save current file if dirty
    if (this.state.isDirty && this.state.currentFile) {
      await this.saveCurrentFile();
    }

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error('File not found');

      const data = await res.json();
      this.state.currentFile = filePath;
      this.state.isDirty = false;

      // Show editor, hide empty state
      document.getElementById('editor-container').style.display = '';
      document.getElementById('toolbar').style.display = '';
      document.getElementById('empty-state').style.display = 'none';

      if (Editor.cm) {
        Editor.setValue(data.content);
      }
      Preview.render(data.content);
      Sidebar.setActive(filePath);

      // Update title and toolbar
      const displayName = Utils.stripExtension(Utils.basename(filePath));
      document.title = `${displayName} - Notetaker`;
      document.getElementById('toolbar-filename').textContent = filePath;
      this.updateSaveIndicator();

      localStorage.setItem('lastOpenFile', filePath);
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  },

  async saveCurrentFile() {
    if (!this.state.currentFile || !Editor.cm) return;

    const content = Editor.getValue();
    try {
      await fetch('/api/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: this.state.currentFile, content }),
      });
      this.state.isDirty = false;
      this.updateSaveIndicator();
    } catch (e) {
      console.error('Failed to save:', e);
    }
  },

  updateSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;

    if (this.state.isDirty) {
      el.textContent = '\u25CF Unsaved';
      el.className = 'save-indicator';
    } else if (this.state.currentFile) {
      el.textContent = '\u2713 Saved';
      el.className = 'save-indicator saved';
      // Fade out "Saved" after 2 seconds
      setTimeout(() => {
        if (!this.state.isDirty) {
          el.textContent = '';
        }
      }, 2000);
    } else {
      el.textContent = '';
    }
  },

  showEmptyState() {
    document.getElementById('editor-container').style.display = 'none';
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('empty-state').style.display = '';
    document.title = 'Notetaker';
    this.state.currentFile = null;
    if (Editor.cm) Editor.setValue('');
    Preview.render('');
  },

  bindGlobalKeys() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }

      // Ctrl/Cmd + N: New note
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        Sidebar.createNote();
      }

      // Ctrl/Cmd + P: Quick search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        document.getElementById('search-input').focus();
        document.getElementById('search-input').select();
      }

      // Escape: Clear search, blur search input
      if (e.key === 'Escape') {
        const searchInput = document.getElementById('search-input');
        if (document.activeElement === searchInput) {
          searchInput.value = '';
          searchInput.blur();
          Sidebar.refresh();
        }
      }
    });
  },

  loadLastOpenFile() {
    const last = localStorage.getItem('lastOpenFile');
    if (last) {
      this.openFile(last).catch(() => {
        this.showEmptyState();
      });
    } else {
      // Try to open welcome.md by default
      this.openFile('welcome.md').catch(() => {
        this.showEmptyState();
      });
    }
  },
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
