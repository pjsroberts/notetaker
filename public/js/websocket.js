/* WebSocket client with auto-reconnect */
const WebSocketClient = {
  ws: null,
  reconnectDelay: 1000,

  init() {
    this.connect();
  },

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
    };

    this.ws.onerror = () => {
      // onerror fires before onclose, no action needed
    };
  },

  handleMessage(data) {
    switch (data.type) {
      case 'file-changed':
        Sidebar.refresh();
        // Reload current file if it changed externally and we have no unsaved edits
        if (data.path === App.state.currentFile && !App.state.isDirty) {
          App.openFile(data.path);
        }
        break;

      case 'file-deleted':
        Sidebar.refresh();
        if (data.path === App.state.currentFile) {
          App.state.currentFile = null;
          App.showEmptyState();
        }
        break;

      case 'refresh':
        Sidebar.refresh();
        break;
    }
  },
};
