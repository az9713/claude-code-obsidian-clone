# Nexus Notes

A local-first, Obsidian-inspired desktop note-taking application built with Electron, React, and CodeMirror 6. Write in Markdown, navigate via wiki-links, visualize connections in a graph view, and search your entire vault — all without a network connection.

![Nexus Notes screenshot placeholder](docs/screenshot.png)

---

## Features

### Editor
- Full CodeMirror 6 Markdown editor with syntax highlighting
- Wiki-link syntax (`[[Note Name]]`) with Ctrl+click-to-navigate support
- `[[` autocomplete for note names already in your vault
- Smart editing: auto-pair brackets/quotes, list continuation on Enter
- Drag-and-drop attachment copying into the vault
- Formatting toolbar (bold, italic, headings, lists, code blocks, links, HR)
- 300 ms debounced auto-save on every keystroke

### Vault Management
- Open any local folder as a vault
- Persisted vault path and window bounds across restarts (`~/.nexusnotes/config.json`)
- File explorer sidebar with collapsible directory tree
- Create notes (`Ctrl+N`), create folders, rename, move, and delete — all via context menu
- Real-time file-system watching (chokidar) — external edits are reflected immediately

### Navigation and Links
- Ctrl+click any `[[wiki-link]]` to jump to that note (created on-the-fly if absent)
- Backlinks panel listing every note that references the active file
- Forward-links index maintained in memory and updated on every save

### Graph View
- Interactive D3-force-directed graph of all note connections
- Click a node to open that note
- Zoom and pan with mouse wheel / drag

### Search
- Full-text search powered by MiniSearch with prefix matching and fuzzy tolerance
- Title boosting (title matches rank higher than body matches)
- Results show up to three matching line snippets per note
- Quick-open (`Ctrl+O`) reuses the search panel

### Daily Notes
- Press `Ctrl+D` to create or open today's note in the `Daily/` folder
- Today's note is named by date (e.g., `Daily/2026-03-10.md`) and created automatically if absent

### UI / Layout
- Three-column layout: sidebar | editor | right panel
- Resizable panels — drag the dividers to adjust column widths
- Toggle sidebar and right panel independently
- Right panel tabs switch between Backlinks and Graph views

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 31 |
| Build tooling | electron-vite 2, Vite 5 |
| UI framework | React 18 |
| Language | TypeScript 5 |
| Editor | CodeMirror 6 (`@codemirror/*`) |
| State management | Zustand 4 |
| Full-text search | MiniSearch 7 |
| File watching | chokidar 3 |
| Graph rendering | D3 (force, selection, zoom) |
| Markdown parsing | markdown-it 14 |
| Packaging | electron-builder 24 |

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18 or later (LTS recommended) |
| npm | 9 or later (bundled with Node.js) |
| Git | Any recent version |

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/az9713/claude-code-obsidian-clone.git
cd claude-code-obsidian-clone

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app opens immediately. On first launch you will be prompted to select a vault folder.

---

## Build

Produce a distributable for your current platform or cross-compile:

```bash
# Windows — produces an NSIS installer in dist/
npm run build:win

# macOS — produces a .dmg in dist/
npm run build:mac

# Linux — produces an AppImage in dist/
npm run build:linux

# Unpackaged directory (useful for testing the production build locally)
npm run build:unpack
```

All build artefacts are written to the `dist/` directory.

---

## Project Structure

```
nexus-notes/
├── src/
│   ├── main/                     # Electron main process
│   │   ├── index.ts              # App entry, window creation, config persistence
│   │   ├── ipc-handlers.ts       # All ipcMain.handle registrations
│   │   ├── file-service.ts       # Filesystem CRUD (open vault, read/write/rename/move notes)
│   │   ├── link-index.ts         # In-memory wiki-link graph (forward + backlinks)
│   │   ├── search-service.ts     # MiniSearch index wrapper
│   │   ├── watcher-service.ts    # chokidar watcher, debounced IPC push events
│   │   └── types.ts              # Shared main-process types
│   ├── preload/
│   │   ├── index.ts              # contextBridge API surface exposed to renderer
│   │   └── index.d.ts            # TypeScript declaration for window.api
│   └── renderer/                 # React renderer process
│       ├── index.html            # HTML entry point
│       ├── main.tsx              # React root mount
│       ├── App.tsx               # Root component, layout, keyboard shortcuts
│       ├── components/
│       │   ├── Editor/
│       │   │   ├── MarkdownEditor.tsx    # CodeMirror 6 host component
│       │   │   ├── cm-wiki-link.ts       # Wiki-link decoration + click handler
│       │   │   ├── cm-autocomplete.ts    # [[  autocomplete extension
│       │   │   ├── cm-smart-edit.ts      # Auto-pair, list continuation
│       │   │   └── cm-drop-handler.ts    # Drag-and-drop attachment handling
│       │   ├── Sidebar/
│       │   │   └── FileExplorer.tsx      # Recursive file tree, context menu
│       │   ├── BacklinksPanel.tsx        # Backlinks list for the active note
│       │   ├── SearchPanel.tsx           # Full-text search overlay
│       │   ├── GraphView.tsx             # D3 force graph
│       │   └── EditorToolbar.tsx         # Formatting action buttons
│       ├── store/
│       │   └── vault-store.ts            # Zustand store (single source of truth)
│       ├── hooks/
│       │   ├── useVault.ts               # loadVault, openNote, saveNote, navigateToLink
│       │   ├── useLinks.ts               # Link resolution helpers
│       │   └── useSearch.ts              # Search query orchestration
│       ├── lib/
│       │   ├── types.ts                  # Shared renderer types (FileNode, LinkEntry, SearchResult)
│       │   └── api.ts                    # Typed wrapper around window.api
│       └── styles/                       # CSS modules / global styles
├── resources/                    # App icons and build resources
├── electron.vite.config.ts       # electron-vite configuration
├── electron-builder.yml          # (or package.json build key) packaging config
├── tsconfig.json                 # Root TypeScript config
└── package.json
```

---

## Recommended Vault Structure

There is no enforced layout, but the following folder structure works well with features like daily notes and attachment handling:

```
your-vault/
├── Daily/          # Daily notes created by Ctrl+D (named YYYY-MM-DD.md)
├── Notes/          # Evergreen or permanent notes
├── Sources/        # Literature notes, references, and reading highlights
├── Attachments/    # Images and other files dropped into the editor
└── Templates/      # Reusable note templates
```

---

## Usage

1. **Open a vault** — on first launch, click "Open Vault" and select any folder containing `.md` files (or an empty folder to start fresh).
2. **Create a note** — press `Ctrl+N`, type a name, and press Enter.
3. **Write** — the editor supports standard Markdown. Type `[[` to insert a wiki-link with autocomplete.
4. **Navigate** — Ctrl+click any `[[wiki-link]]` to jump to that note. If the note does not exist it is created automatically.
5. **Daily note** — press `Ctrl+D` to open or create today's note inside the `Daily/` folder.
6. **Search** — press `Ctrl+Shift+F` or `Ctrl+O` to open the search overlay. Results update as you type.
7. **Explore connections** — the right panel shows backlinks to the active note. Switch to the Graph tab for a visual overview.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+N` | Create a new note |
| `Ctrl+O` | Open search / quick-open |
| `Ctrl+Shift+F` | Open full-text search |
| `Ctrl+D` | Open / create today's daily note |
| `Ctrl+G` | Toggle graph view |
| `Ctrl+Click [[link]]` | Navigate to linked note |

CodeMirror default shortcuts (undo/redo, select-all, find, etc.) are also available inside the editor.

---

## Claude Code Integration

Because your vault is just a folder of Markdown files on disk, you don't need to interact with Nexus Notes directly to manage your content. You can use [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to do it all with natural language:

- **"Add today's daily note with these 5 videos I watched"** — Claude Code creates `Daily/2026-03-10.md` with a checklist of wiki-linked items.
- **"Create a hub note for the Dylan Patel interview with key takeaways"** — Creates a structured note in `Notes/` with metadata, wiki-links to source files, and your summary.
- **"Import transcript.txt and README.txt from ~/Downloads/my_video/ as sources"** — Copies files into `Sources/`, adds standardized headers with `**Parent:** [[hub note]]` backlinks, and links them from the hub note.
- **"What did I learn about agent design this week?"** — Claude Code reads your vault and synthesizes an answer from your notes.

This works because Nexus Notes watches the filesystem in real time. Any file Claude Code creates or edits appears in the app instantly — no restart or manual refresh needed. The wiki-links, backlinks, search index, and graph view all update automatically.

> **Tip:** This is the recommended workflow for power users. Use Nexus Notes as the visual interface for reading and navigating your knowledge graph, and use Claude Code as the hands-free way to populate it.

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Run `npm install` and `npm run dev` to confirm the baseline works.
3. Make your changes. Match the code style described in `CLAUDE.md`.
4. Run `npm run lint` and `npm run format` before committing.
5. Open a pull request with a clear description of the change and why it is needed.

Please open an issue before starting large features so the approach can be discussed first.

---

## License

MIT License. See [LICENSE](LICENSE) for the full text.
