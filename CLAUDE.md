# CLAUDE.md — Nexus Notes

Context file for Claude Code. Read this before making any changes.

---

## Project Overview

Nexus Notes is a cross-platform desktop note-taking app modelled after Obsidian. It is an Electron application where:

- The **main process** (Node.js) owns the filesystem, the wiki-link index, the full-text search index, and the file-system watcher.
- The **renderer process** (React + CodeMirror) owns the UI, editor state, and global Zustand store.
- The **preload script** bridges them through a typed `window.api` object exposed via `contextBridge`.

All inter-process communication goes through named IPC channels. The renderer never accesses `fs` directly.

**Tech stack:** Electron 31, React 18, TypeScript 5, CodeMirror 6, Zustand 4, MiniSearch 7, chokidar 3, D3 (force/selection/zoom), electron-vite 2.

---

## Directory Structure

```
src/
├── main/                    # Electron main process (Node.js)
│   ├── index.ts             # Window creation, app lifecycle, vault/watcher IPC
│   ├── ipc-handlers.ts      # All fs:*, links:*, search:*, index:* handlers
│   ├── file-service.ts      # Filesystem CRUD for notes and attachments
│   ├── link-index.ts        # In-memory forward + backlink graph
│   ├── search-service.ts    # MiniSearch wrapper (build, update, remove, query)
│   ├── watcher-service.ts   # chokidar watcher pushing vault:* events to renderer
│   └── types.ts             # Main-process-only types
├── preload/
│   ├── index.ts             # contextBridge.exposeInMainWorld('api', ...)
│   └── index.d.ts           # TypeScript declaration: declare const window: { api: Api }
└── renderer/
    ├── App.tsx              # Root layout, panel toggles, global keyboard shortcuts, resizable sidebar drag handles
    ├── main.tsx             # React.createRoot entry
    ├── components/
    │   ├── Editor/
    │   │   ├── MarkdownEditor.tsx   # Creates and owns the EditorView instance
    │   │   ├── cm-wiki-link.ts      # ViewPlugin: decorates [[links]], Ctrl+click handler
    │   │   ├── cm-autocomplete.ts   # Autocomplete source for [[ trigger
    │   │   ├── cm-smart-edit.ts     # Key bindings: auto-pair, list continuation
    │   │   └── cm-drop-handler.ts   # EditorView.domEventHandlers for drop
    │   ├── Sidebar/
    │   │   └── FileExplorer.tsx     # Recursive tree, right-click context menu
    │   ├── BacklinksPanel.tsx
    │   ├── SearchPanel.tsx
    │   ├── GraphView.tsx            # D3 force simulation + SVG rendering
    │   └── EditorToolbar.tsx
    ├── store/
    │   └── vault-store.ts           # Single Zustand store for all renderer state
    ├── hooks/
    │   ├── useVault.ts              # loadVault, openNote, saveNote, navigateToLink, watcher listeners
    │   ├── useLinks.ts              # Link helpers
    │   └── useSearch.ts            # Search query → store update
    ├── lib/
    │   ├── types.ts                 # FileNode, LinkEntry, SearchResult
    │   └── api.ts                   # Typed re-exports / helpers over window.api
    └── styles/                      # CSS
```

---

## Key Patterns and Conventions

### Zustand Store (`vault-store.ts`)

There is a single flat Zustand store. All renderer state lives here:

```ts
// Reading state in a component
const { activeFile, backlinks } = useVaultStore()

// Writing state from outside React (e.g., inside a callback)
useVaultStore.getState().setActiveContent(content)
```

Selectors are not memoised separately — components subscribe to the whole store. If performance becomes a concern, add per-slice selectors using the selector overload of `useVaultStore`.

Do not add local `useState` for anything that needs to be shared across components. Put it in the store.

### IPC Pattern

Every renderer-to-main call goes through `window.api`, which is defined in `src/preload/index.ts` and typed via `src/preload/index.d.ts`.

Channel naming convention:
- `vault:*` — vault selection and watcher lifecycle (handled in `main/index.ts`)
- `fs:*` — file CRUD operations (handled in `ipc-handlers.ts` via `FileService`)
- `links:*` — link graph queries (handled in `ipc-handlers.ts` via `LinkIndex`)
- `search:*` — full-text search (handled in `ipc-handlers.ts` via `SearchService`)
- `index:*` — incremental index updates triggered by watcher events

Push events from main to renderer use `mainWindow.webContents.send(channel, payload)` and are received via `ipcRenderer.on` in the preload. The preload wraps each one in a subscriber function that returns an unsubscribe callback — call it in a `useEffect` cleanup.

### CodeMirror Extensions

All custom CodeMirror behaviour is in `src/renderer/components/Editor/`. Each file exports either:
- A `ViewPlugin` (e.g., `wikiLinkPlugin`) — for decorations that react to document/viewport changes.
- An `Extension` array (e.g., `smartEditExtensions`) — for key bindings or state effects.
- A plain function returning an extension (e.g., `buildAutocomplete(noteNames)`) — when the extension needs runtime parameters.

Extensions are composed in `MarkdownEditor.tsx` and passed to `new EditorView({ extensions: [...] })`. When the vault changes (e.g., new notes added), recreate or reconfigure the extensions that depend on dynamic data (autocomplete note list) using `EditorView.reconfigure` or by remounting.

### Auto-save

`App.tsx` uses a 300 ms debounced `setTimeout` ref (`saveTimerRef`) to call `saveNote` on every content change. Do not add additional save triggers — the debounce covers all cases.

### Resizable Sidebar Panels

The left sidebar and right panel are resizable via drag handles rendered in `App.tsx`. Panel widths are constrained to a **150–500 px** range. The current width is stored in the Zustand store (`sidebarWidth`, `rightPanelWidth`) and persisted to `~/.nexusnotes/config.json` alongside `vaultPath` and `windowBounds`.

Do not apply hard-coded widths to sidebar or panel elements in CSS — let the store value drive the `width` style so the drag handle remains the single source of truth.

### Config Persistence

`~/.nexusnotes/config.json` stores `vaultPath` and `windowBounds`. Read/write is done synchronously in `main/index.ts` using the `loadConfig` / `saveConfig` helpers. Do not store user preferences anywhere else.

---

## How to Build and Run

```bash
# Install dependencies
npm install

# Development (hot reload for renderer, auto-restart for main)
npm run dev

# Production build (all platforms detect automatically)
npm run build

# Specific platform installers
npm run build:win      # NSIS installer
npm run build:mac      # DMG
npm run build:linux    # AppImage

# Lint and format
npm run lint
npm run format
```

The dev server uses electron-vite. The renderer runs at a local Vite dev URL; the main process is restarted automatically when its source changes.

---

## Architecture Summary

```
Renderer (React)                    Main Process (Node.js)
─────────────────────               ──────────────────────────────
useVault hook          ──IPC──>    ipc-handlers.ts
  window.api.openVault              FileService.openVault()
  window.api.readNote               LinkIndex.buildIndex()
  window.api.writeNote              SearchService.buildIndex()
  window.api.search                 SearchService.search()
  window.api.getBacklinks           LinkIndex.getBacklinks()

WatcherService                <──push── mainWindow.webContents.send()
  onFileChanged                          vault:file-changed
  onFileAdded                            vault:file-added
  onFileRemoved                          vault:file-removed
```

The renderer is sandboxed (`sandbox: false` is set only to allow the preload to use Node APIs — do not expand this). The renderer must not import `electron` or `fs` directly.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+N | Create new note (saved to `Notes/` subfolder of the vault) |
| Ctrl+D | Open or create today's daily note (saved to `Daily/` subfolder) |
| Ctrl+click | Navigate to a `[[wiki-link]]` from within the editor |

---

## Vault Folder Convention

Nexus Notes organises files within the chosen vault root using the following subfolders:

| Folder | Purpose |
|---|---|
| `Daily/` | Daily notes created via Ctrl+D (named `YYYY-MM-DD.md`) |
| `Notes/` | Regular notes created via Ctrl+N |
| `Sources/` | Reference/source material |
| `Attachments/` | Images and other binary attachments |
| `Templates/` | Note templates |

These folders are created on demand. Files placed directly in the vault root by external tools are still indexed and usable.

---

## Important Files and What They Do

| File | Purpose |
|---|---|
| `src/main/index.ts` | App bootstrap. Creates `BrowserWindow`, registers vault-lifecycle IPC handlers, starts `WatcherService` |
| `src/main/ipc-handlers.ts` | Single registration point for all `fs:*`, `links:*`, `search:*`, `index:*` handlers |
| `src/main/file-service.ts` | All `fs` operations: open vault (returns `FileNode` tree), read/write/create/delete/rename/move notes, copy attachments. New notes created via Ctrl+N are written to the `Notes/` subfolder |
| `src/main/link-index.ts` | Parses `[[wiki-link]]` syntax from file content, maintains a forward-link map and a reverse (backlink) map |
| `src/main/search-service.ts` | Wraps MiniSearch. Indexes title + body. Supports incremental add/remove. Returns `SearchResult[]` |
| `src/main/watcher-service.ts` | Wraps chokidar. Debounces events (100 ms) before pushing to renderer |
| `src/preload/index.ts` | Defines and exposes `window.api`. This is the only place `ipcRenderer` is used |
| `src/renderer/store/vault-store.ts` | Zustand store — single source of truth for all UI state |
| `src/renderer/hooks/useVault.ts` | Orchestrates vault loading, note opening/saving, watcher event handling |
| `src/renderer/components/Editor/MarkdownEditor.tsx` | Mounts the CodeMirror `EditorView`, composes all CM extensions |
| `src/renderer/components/Editor/cm-wiki-link.ts` | `ViewPlugin` that highlights `[[...]]` spans and handles Ctrl+click-to-navigate |
| `src/renderer/components/GraphView.tsx` | D3 force simulation over all vault links, SVG nodes/edges, zoom behaviour |

---

## Common Development Tasks

### Adding a New IPC Handler

1. Add the handler to `src/main/ipc-handlers.ts`:
   ```ts
   ipcMain.handle('fs:myNewOp', async (_e, arg: string) => {
     return FileService.myNewOp(arg)
   })
   ```

2. Implement the operation in `src/main/file-service.ts` (or the appropriate service).

3. Add the typed wrapper to `src/preload/index.ts`:
   ```ts
   myNewOp: (arg: string): Promise<ReturnType> => ipcRenderer.invoke('fs:myNewOp', arg),
   ```

4. Update `src/preload/index.d.ts` if it contains manual type declarations.

5. Call it from the renderer via `window.api.myNewOp(arg)`.

### Adding a New React Component

1. Create the file under `src/renderer/components/` following the existing naming style (PascalCase TSX).
2. Keep state local unless it needs to be shared — if shared, add to `vault-store.ts`.
3. Consume `window.api` calls inside custom hooks under `src/renderer/hooks/`, not directly in components.
4. Import and render the component from the appropriate parent (`App.tsx` for top-level panels).

### Adding a New CodeMirror Extension

1. Create `src/renderer/components/Editor/cm-my-feature.ts`.
2. Export a `ViewPlugin`, `Extension`, or factory function.
3. Import and add it to the `extensions` array inside `MarkdownEditor.tsx`.
4. If the extension depends on runtime state (e.g., note names from the store), pass the data as a prop to `MarkdownEditor` and use `EditorView.reconfigure` or a `Compartment` to update it without remounting.

Pattern for a `Compartment`-based dynamic extension:
```ts
// inside MarkdownEditor.tsx
const myCompartment = new Compartment()

// initial setup
const view = new EditorView({
  extensions: [myCompartment.of(buildMyExtension(initialProp))]
})

// on prop change (useEffect)
view.dispatch({ effects: myCompartment.reconfigure(buildMyExtension(newProp)) })
```

---

## Testing Approach

There is no automated test suite at v1.0. Manual testing checklist for any change:

- Open a vault, create a note, type content, close and reopen the app — content persists.
- Create a `[[wiki-link]]` — autocomplete appears, Ctrl+clicking navigates.
- Edit a note externally (in another editor) — change is reflected in Nexus Notes within ~200 ms.
- Delete a note from the sidebar — editor clears if it was active.
- Use the search overlay — results appear and clicking opens the note.
- Graph view renders nodes and edges; clicking a node opens the note.
- Build with `npm run build:win` (or appropriate platform) and smoke-test the installer.

When adding automated tests, prefer integration tests using Playwright's Electron support over unit tests for individual modules.

---

## Deferred Features (v2 List)

The following were explicitly scoped out of v1 and should not be partially implemented without a full plan:

- Tags and tag-based filtering
- PDF and image preview in the right panel
- Plugin system / community extensions
- Sync and conflict resolution (cloud or Git)
- Multi-window / multi-vault support
- Mobile / web companion app
- Export to HTML or PDF
- Theming system beyond CSS variables

---

## Code Style Conventions

- **TypeScript**: strict mode. No `any` unless interfacing with untyped third-party APIs (D3 DOM access, CM internals). Use `unknown` + type guards instead.
- **Imports**: external packages first, then internal by depth (store before components before hooks).
- **Functions**: camelCase, verb-first (`buildIndex`, `parseFileLinks`, `openNote`).
- **Classes**: PascalCase for services (`FileService`, `LinkIndex`, `WatcherService`).
- **Files**: PascalCase for React components (`MarkdownEditor.tsx`), camelCase with `cm-` prefix for CodeMirror modules (`cm-wiki-link.ts`), camelCase for everything else.
- **Error handling**: `try/catch` in all `async` IPC handlers. Log errors to `console.error` in main; surface meaningful messages to the renderer only when the user needs to act.
- **Comments**: explain *why*, not *what*. Document non-obvious regex patterns, D3 simulation tuning parameters, and CodeMirror Decoration/RangeSet constraints.
- **No default exports** in non-component files. Use named exports everywhere except React components (which default-export by convention).
- **Formatting**: enforced by Prettier (`npm run format`). Run before every commit.
- **Linting**: ESLint (`npm run lint`). Fix all warnings before opening a PR.
