# Welcome to Notetaker

Your local-first, privacy-respecting note-taking app. All your notes are stored as plain markdown files on your machine.

## Getting Started

### Creating Notes
- Click the **+** button in the sidebar to create a new note
- Or press **Ctrl+N** (Cmd+N on Mac)

### Formatting
Use the toolbar above the editor or type markdown directly:

- **Bold** with `**text**` or Ctrl+B
- *Italic* with `*text*` or Ctrl+I
- ~~Strikethrough~~ with `~~text~~`
- `inline code` with backticks

### Headings
```
# Heading 1
## Heading 2
### Heading 3
```

### Lists
- Bullet lists with `-` or `*`
- Numbered lists with `1.`
- Task lists with `- [ ]`

#### Task List Example
- [x] Install Notetaker
- [x] Open in browser
- [ ] Create your first note
- [ ] Try wiki links

### Code Blocks
Use triple backticks with a language name:

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```

### Blockquotes
> Notes are stored as plain `.md` files in the `notes/` folder.
> You can edit them with any text editor.

## Wiki Links

Link between your notes using double brackets: [[note name]]

- Type `[[` followed by a note name and `]]`
- Click a wiki link in the preview to navigate to that note
- If the linked note doesn't exist, you'll be offered to create it
- Use `[[note|custom text]]` for custom display text
- Or press **Ctrl+Shift+K** to insert a wiki link

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+N | New Note |
| Ctrl+P | Search |
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+K | Insert Link |
| Ctrl+Shift+K | Insert Wiki Link |
| Escape | Clear Search |

## Tips

1. **Auto-save**: Your notes save automatically after 2 seconds of inactivity
2. **Search**: Use the search bar or Ctrl+P to find notes quickly
3. **Resize**: Drag the divider between editor and preview to resize
4. **View modes**: Toggle between split, editor-only, and preview-only views
5. **External edits**: Edit your `.md` files in any editor - changes sync automatically

---

Happy note-taking!
