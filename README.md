# Notetaker

Local-first markdown note-taking app with a split editor/preview UI, wiki links, and live updates.

## Features

- Local file-based notes stored in `notes/`
- Markdown editor + rendered preview
- Wiki-style note links (`[[note-name]]`)
- Sidebar note tree with folders/search
- WebSocket updates when files change

## Getting Started

### Requirements

- Node.js 18+ (Node 20 recommended)

### Install

```bash
npm install
```

### Run

```bash
npm start
```

Open `http://localhost:3000`.

### Development

```bash
npm run dev
```

## Project Structure

- `server.js` - Express + WebSocket server
- `lib/` - API routes, file utilities, watcher logic
- `public/` - Frontend HTML/CSS/JS
- `notes/` - Local markdown notes directory

## Contributing

See `CONTRIBUTING.md` for workflow and contribution guidelines.

## Security

See `SECURITY.md` for responsible disclosure guidance.

## License

MIT - see `LICENSE`.
