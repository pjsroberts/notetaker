/* Sidebar file tree component */
const Sidebar = {
  container: null,
  contextMenu: null,
  contextTarget: null,

  async init() {
    this.container = document.getElementById('file-tree');
    this.contextMenu = document.getElementById('context-menu');

    document.getElementById('btn-new-note').addEventListener('click', () => this.createNote());
    document.getElementById('btn-new-folder').addEventListener('click', () => this.createFolder());
    document.getElementById('btn-empty-new').addEventListener('click', () => this.createNote());

    document.getElementById('search-input').addEventListener(
      'input',
      Utils.debounce((e) => this.search(e.target.value), 300)
    );

    // Context menu actions
    this.contextMenu.querySelectorAll('.context-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'rename') this.renameFile(this.contextTarget);
        if (action === 'delete') this.deleteFile(this.contextTarget);
        this.hideContextMenu();
      });
    });

    // Hide context menu on click elsewhere
    document.addEventListener('click', () => this.hideContextMenu());

    // Sidebar resize
    this.initResizer();

    await this.refresh();
  },

  async refresh() {
    try {
      const res = await fetch('/api/files');
      const tree = await res.json();
      App.state.files = tree;
      this.container.innerHTML = '';
      this.renderTree(tree.children, this.container, 0);
    } catch (e) {
      this.container.innerHTML = '<div style="padding:12px;color:var(--text-muted)">Failed to load files</div>';
    }
  },

  renderTree(items, parent, depth) {
    if (!items) return;

    for (const item of items) {
      if (item.type === 'directory') {
        // Folder item
        const el = document.createElement('div');
        el.className = 'tree-item tree-directory';
        el.style.paddingLeft = `${12 + depth * 16}px`;
        el.innerHTML = `<span class="tree-icon folder-icon">&#9654;</span>
                        <span class="tree-name">${Utils.escapeHtml(item.name)}</span>`;

        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children';

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const icon = el.querySelector('.folder-icon');
          if (childContainer.classList.contains('collapsed')) {
            childContainer.classList.remove('collapsed');
            icon.classList.add('expanded');
          } else {
            childContainer.classList.add('collapsed');
            icon.classList.remove('expanded');
          }
        });

        parent.appendChild(el);
        parent.appendChild(childContainer);
        this.renderTree(item.children, childContainer, depth + 1);
      } else {
        // File item
        const el = document.createElement('div');
        el.className = 'tree-item tree-file';
        el.style.paddingLeft = `${12 + depth * 16}px`;
        el.dataset.path = item.path;

        const displayName = Utils.stripExtension(item.name);
        el.innerHTML = `<span class="tree-icon file-icon">&#9782;</span>
                        <span class="tree-name">${Utils.escapeHtml(displayName)}</span>`;

        if (App.state.currentFile === item.path) {
          el.classList.add('active');
        }

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          App.openFile(item.path);
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.showContextMenu(e, item.path);
        });

        parent.appendChild(el);
      }
    }
  },

  setActive(filePath) {
    this.container.querySelectorAll('.tree-item.active').forEach((el) => el.classList.remove('active'));
    const target = this.container.querySelector(`[data-path="${CSS.escape(filePath)}"]`);
    if (target) target.classList.add('active');
  },

  showContextMenu(event, filePath) {
    this.contextTarget = filePath;
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = event.clientX + 'px';
    this.contextMenu.style.top = event.clientY + 'px';

    // Keep menu in viewport
    const rect = this.contextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.contextMenu.style.left = window.innerWidth - rect.width - 8 + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      this.contextMenu.style.top = window.innerHeight - rect.height - 8 + 'px';
    }
  },

  hideContextMenu() {
    this.contextMenu.style.display = 'none';
    this.contextTarget = null;
  },

  async renameFile(filePath) {
    if (!filePath) return;
    const oldName = Utils.basename(filePath);
    const newName = prompt('Rename to:', oldName);
    if (!newName || newName === oldName) return;

    const dir = Utils.dirname(filePath);
    const newFileName = newName.endsWith('.md') ? newName : newName + '.md';
    const newPath = dir ? dir + '/' + newFileName : newFileName;

    try {
      await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: filePath, newPath }),
      });

      if (App.state.currentFile === filePath) {
        App.state.currentFile = newPath;
        localStorage.setItem('lastOpenFile', newPath);
      }
      await this.refresh();
    } catch (e) {
      alert('Failed to rename file');
    }
  },

  async deleteFile(filePath) {
    if (!filePath) return;
    if (!confirm(`Delete "${Utils.basename(filePath)}"?`)) return;

    try {
      await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, { method: 'DELETE' });

      if (App.state.currentFile === filePath) {
        App.state.currentFile = null;
        App.showEmptyState();
      }
      await this.refresh();
    } catch (e) {
      alert('Failed to delete file');
    }
  },

  async search(query) {
    if (!query || query.length < 2) {
      await this.refresh();
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const results = await res.json();
      this.container.innerHTML = '';

      if (results.length === 0) {
        this.container.innerHTML =
          '<div style="padding:12px;color:var(--text-muted);font-size:13px;">No results found</div>';
        return;
      }

      for (const result of results) {
        const el = document.createElement('div');
        el.className = 'tree-item tree-file search-result';
        el.innerHTML = `<span class="tree-name">${Utils.escapeHtml(Utils.stripExtension(Utils.basename(result.path)))}</span>
                        <span class="search-snippet">${Utils.escapeHtml(result.snippet)}</span>`;
        el.addEventListener('click', () => {
          document.getElementById('search-input').value = '';
          App.openFile(result.path);
          this.refresh();
        });
        this.container.appendChild(el);
      }
    } catch (e) {
      // ignore search errors
    }
  },

  async createNote() {
    const name = prompt('Note name:');
    if (!name) return;

    const fileName = name.endsWith('.md') ? name : name + '.md';
    const title = Utils.stripExtension(name);

    try {
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: fileName, content: `# ${title}\n\n` }),
      });
      await this.refresh();
      App.openFile(fileName);
    } catch (e) {
      alert('Failed to create note');
    }
  },

  async createFolder() {
    const name = prompt('Folder name:');
    if (!name) return;

    try {
      await fetch('/api/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: name }),
      });
      await this.refresh();
    } catch (e) {
      alert('Failed to create folder');
    }
  },

  initResizer() {
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.getElementById('sidebar');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizer.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const width = Math.min(Math.max(e.clientX, 180), 450);
      sidebar.style.width = width + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  },
};
