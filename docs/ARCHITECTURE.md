# Nexus Notes — Architecture Documentation

> Generated from source analysis of all files in `src/`.
> Last updated: 2026-03-10

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Main Process Architecture](#3-main-process-architecture)
4. [Renderer Architecture](#4-renderer-architecture)
5. [IPC Communication Flow](#5-ipc-communication-flow)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [CodeMirror Extension Architecture](#7-codemirror-extension-architecture)
8. [State Management Architecture](#8-state-management-architecture)
9. [Component Communication Patterns](#9-component-communication-patterns)
10. [File System Architecture](#10-file-system-architecture)
11. [Link System Architecture](#11-link-system-architecture)
12. [Build and Packaging Architecture](#12-build-and-packaging-architecture)

---

## 1. System Overview

Nexus Notes is a desktop note-taking application modelled on Obsidian. It solves the problem of managing a local folder of Markdown files ("vault") with rich features: a file explorer, a CodeMirror-powered Markdown editor, bidirectional wiki-link navigation, a full-text search engine, a D3-force graph view of note connections, and live file-system watching so that external edits are reflected in real time.

The application is built on **Electron 31**, meaning it runs three distinct OS-level processes that communicate strictly through Electron's IPC mechanism:

```
+---------------------------------------------------------------+
|                        Operating System                        |
|                                                               |
|   +-------------------+        +---------------------------+  |
|   |   Main Process    |        |     Renderer Process      |  |
|   |   (Node.js)       |  IPC   |   (Chromium / React)      |  |
|   |                   |<------>|                           |  |
|   | - BrowserWindow   |        | - React 18 UI             |  |
|   | - FileService     |        | - CodeMirror 6 editor     |  |
|   | - WatcherService  |        | - D3 graph view           |  |
|   | - LinkIndex       |        | - Zustand state store     |  |
|   | - SearchService   |        |                           |  |
|   | - IPC Handlers    |        +------------^--------------+  |
|   +-------------------+                     |                 |
|                                    +--------+--------+        |
|                                    |  Preload Script |        |
|                                    | (contextBridge) |        |
|                                    +-----------------+        |
+---------------------------------------------------------------+
```

**Key design constraints:**

- The renderer process has no direct access to Node.js APIs (no `fs`, no `path`). All disk work goes through IPC to the main process.
- The preload script is the only bridge. It exposes a typed `window.api` object to the renderer via `contextBridge.exposeInMainWorld`.
- `sandbox: false` is set in `BrowserWindow.webPreferences` (see `src/main/index.ts` line 44), which allows the preload to access `ipcRenderer` without a separate sandbox bypass.
- The main process holds all mutable server-side state: the `LinkIndex` and `SearchService` instances are module-level singletons inside `ipc-handlers.ts` (lines 6–7).

---

## 2. High-Level Architecture

The three-process model expanded to show the services and component groups inside each boundary:

```
+==========================+   IPC invoke/handle   +==========================+
||      MAIN PROCESS      ||<=====================>||    PRELOAD SCRIPT      ||
||      (Node.js)         ||                       ||  (src/preload/index.ts)||
||                        ||                       ||                        ||
||  index.ts              ||                       ||  contextBridge         ||
||  +-----------------+   ||  IPC push events      ||  .exposeInMainWorld    ||
||  | BrowserWindow   |---||---------------------->||  ('api', api)          ||
||  +-----------------+   ||                       ||                        ||
||  +-----------------+   ||                       ||  window.api = {        ||
||  | WatcherService  |   ||                       ||    selectVault()       ||
||  | (chokidar)      |   ||                       ||    openVault()         ||
||  +-----------------+   ||                       ||    readNote()          ||
||                        ||                       ||    writeNote()         ||
||  ipc-handlers.ts       ||                       ||    createNote()        ||
||  +-----------------+   ||                       ||    deleteNote()        ||
||  | FileService     |   ||                       ||    renameNote()        ||
||  | (fs operations) |   ||                       ||    moveNote()          ||
||  +-----------------+   ||                       ||    copyAttachment()    ||
||  +-----------------+   ||                       ||    getBacklinks()      ||
||  | LinkIndex       |   ||                       ||    getForwardLinks()   ||
||  | (wiki graph)    |   ||                       ||    getAllLinks()        ||
||  +-----------------+   ||                       ||    resolveLink()       ||
||  +-----------------+   ||                       ||    getAllNoteNames()    ||
||  | SearchService   |   ||                       ||    search()            ||
||  | (MiniSearch)    |   ||                       ||    onFileChanged()     ||
||  +-----------------+   ||                       ||    onFileAdded()       ||
||                        ||                       ||    onFileRemoved()     ||
+==========================+                       ||  }                     ||
                                                   +==========================+
                                                              |
                                                   (window.api)
                                                              |
                                                   +==========================+
                                                   ||   RENDERER PROCESS     ||
                                                   ||  (Chromium / React 18) ||
                                                   ||                        ||
                                                   ||  main.tsx              ||
                                                   ||  App.tsx (root)        ||
                                                   ||                        ||
                                                   ||  Zustand store         ||
                                                   ||  (vault-store.ts)      ||
                                                   ||                        ||
                                                   ||  Hooks                 ||
                                                   ||  useVault.ts           ||
                                                   ||  useLinks.ts           ||
                                                   ||  useSearch.ts          ||
                                                   ||                        ||
                                                   ||  Components            ||
                                                   ||  FileExplorer          ||
                                                   ||  MarkdownEditor (CM6)  ||
                                                   ||  EditorToolbar         ||
                                                   ||  BacklinksPanel        ||
                                                   ||  GraphView (D3)        ||
                                                   ||  SearchPanel           ||
                                                   +==========================+
```

---

## 3. Main Process Architecture

### Service Dependency Map

```
src/main/index.ts
+----------------------------------------------------------------------+
|  app.whenReady()                                                      |
|                                                                       |
|  registerIpcHandlers()  <-- ipc-handlers.ts                          |
|  |                                                                    |
|  |  creates singletons:                                               |
|  |    linkIndex    = new LinkIndex()    <-- link-index.ts            |
|  |    searchService = new SearchService() <-- search-service.ts      |
|  |                                                                    |
|  |  delegates file I/O to:                                            |
|  |    FileService  (static class)       <-- file-service.ts          |
|  |                                                                    |
|  createWindow()                                                       |
|                                                                       |
|  ipcMain.handle('vault:startWatching') --> new WatcherService()      |
|  |                                         <-- watcher-service.ts    |
|  |    WatcherService holds reference                                  |
|  |    to BrowserWindow to push events                                 |
|                                                                       |
|  Config: ~/.nexusnotes/config.json                                    |
|    loadConfig() / saveConfig()                                        |
|    persists: vaultPath, windowBounds                                  |
+----------------------------------------------------------------------+
```

### Service Responsibilities

**`src/main/index.ts`** — Application bootstrap

- Manages application lifecycle (`app.whenReady`, `window-all-closed`, `activate`).
- Creates the single `BrowserWindow` with the preload injected (`src/preload/index.js`).
- Persists `vaultPath` and `windowBounds` to `~/.nexusnotes/config.json`.
- Holds a module-level `watcherService` variable; replaces it each time `vault:startWatching` is called (line 98-104).
- Handles three vault-lifecycle IPC channels directly: `vault:select`, `vault:getSaved`, `vault:startWatching`, `vault:stopWatching`.

**`src/main/file-service.ts`** — Pure file I/O (static class, no state)

| Method | Behaviour |
|---|---|
| `openVault(dirPath)` | Calls `buildTree` recursively; sorts directories before files; skips dot-files. |
| `buildTree(currentPath, rootPath)` | Returns a `FileNode` tree. Directories list `.` filtered children sorted alphabetically with folders first (lines 17-23). |
| `readNote(filePath)` | `fs.readFileSync` UTF-8. |
| `writeNote(filePath, content)` | `mkdirSync` with `recursive: true` before write — creates missing parent directories automatically. |
| `createNote(dirPath, name)` | Appends `.md` if missing; throws if file already exists. |
| `deleteNote(filePath)` | Prefers `shell.trashItem` (recoverable); falls back to `fs.unlinkSync`. |
| `renameNote(oldPath, newPath)` | Plain `fs.renameSync`. |
| `moveNote(filePath, newDirPath)` | `fs.renameSync` to the target directory; returns the new path. |
| `createFolder(dirPath, name)` | `mkdirSync` with `recursive: true`; idempotent. |
| `copyAttachment(sourcePath, vaultPath)` | Copies to `{vault}/Attachments/`; appends `-{Date.now()}` on name collision (line 89). Returns the final filename (not full path). |
| `listAllNotes(vaultPath)` | Recursive walk; skips dot-files; returns only `.md` files. |

**`src/main/watcher-service.ts`** — File-system change notifications

```
WatcherService constructor(vaultPath, mainWindow)
|
+--> chokidar.watch(vaultPath, {
|      ignored: /(^|[/\\])\./,   <-- hides dot-files
|      ignoreInitial: true,       <-- no events on startup
|      awaitWriteFinish: {
|        stabilityThreshold: 100, <-- wait for write to settle
|        pollInterval: 50
|      }
|    })
|
+--> on('change')  --> debounce(100ms) --> mainWindow.webContents.send('vault:file-changed', filePath)
+--> on('add')     --> debounce(100ms) --> mainWindow.webContents.send('vault:file-added',   filePath)
+--> on('unlink')  --> debounce(100ms) --> mainWindow.webContents.send('vault:file-removed', filePath)
+--> on('addDir')  --> debounce(100ms) --> mainWindow.webContents.send('vault:file-added',   dirPath)
+--> on('unlinkDir')-> debounce(100ms) --> mainWindow.webContents.send('vault:file-removed', dirPath)

Debounce key = "event:filePath"  (per-file, per-event type)
close() cancels all pending timers before watcher.close()
```

Push events are one-way: main → renderer via `webContents.send`. The renderer registers listeners via the preload's `onFileChanged`, `onFileAdded`, `onFileRemoved` (which return unsubscribe functions).

**`src/main/link-index.ts`** — Bidirectional wiki-link graph

```
LinkIndex internal state
+----------------------------------+
|  forwardLinks: Map<             |
|    filePath,                     |
|    string[]   (target paths)    |
|  >                               |
|                                  |
|  backLinks: Map<                |
|    targetPath,                   |
|    LinkEntry[] {                 |
|      source, target, line, context|
|    }                             |
|  >                               |
|                                  |
|  notesByName: Map<              |
|    name (lowercase),             |
|    absoluteFilePath              |
|  >                               |
+----------------------------------+
```

Key behaviours:
- `buildIndex(vaultPath, notePaths)` — full rebuild; shortest path wins on name collision (line 22).
- `parseFileLinks(filePath)` — incremental update for one file: clears old back-link entries for this source, re-parses with `WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g`, records unresolved link names as bare strings in `forwardLinks`.
- `resolveLink(linkName)` — case-insensitive lookup in `notesByName`.
- `removeNote(filePath)` — removes from all three maps and cleans up foreign back-link entries (lines 84-95).

**`src/main/search-service.ts`** — Full-text search

```
SearchService
+--> MiniSearch({
|      fields: ['title', 'body'],
|      storeFields: ['title', 'path'],
|      searchOptions: {
|        boost: { title: 2 },
|        prefix: true,
|        fuzzy: 0.2
|      }
|    })
|
+--> buildIndex()   : removeAll() + addAll(docs)
+--> updateNote()   : discard(id) + add(doc)
+--> removeNote()   : discard(id)
+--> search(query)  : miniSearch.search() -> slice(0,20) -> re-read file for match lines
```

`search()` reads each result file again at query time to find up to 3 matching line snippets (lines 71-84). Results are capped at 20 (line 70).

**`src/main/ipc-handlers.ts`** — IPC routing layer

`registerIpcHandlers()` wires all `ipcMain.handle` calls. It is the only place that composes `FileService`, `LinkIndex`, and `SearchService` together. Every mutating file operation (write, create, delete, rename, move) triggers corresponding index updates on both `linkIndex` and `searchService`:

```
fs:openVault   --> FileService.openVault + linkIndex.buildIndex + searchService.buildIndex
fs:writeNote   --> FileService.writeNote + linkIndex.parseFileLinks + searchService.updateNote
fs:createNote  --> FileService.createNote + linkIndex.updateNoteRegistry + searchService.updateNote
fs:deleteNote  --> FileService.deleteNote + linkIndex.removeNote + searchService.removeNote
fs:renameNote  --> FileService.renameNote + linkIndex.remove+update+parse + search.remove+update
fs:moveNote    --> FileService.moveNote   + linkIndex.remove+update+parse + search.remove+update
index:rebuildFile --> linkIndex.updateNoteRegistry + linkIndex.parseFileLinks + searchService.updateNote
index:removeFile  --> linkIndex.removeNote + searchService.removeNote
```

**`src/main/types.ts`** — Shared data shapes (mirrored in `src/renderer/lib/types.ts`)

```typescript
FileNode  { name, path, type: 'file'|'directory', children? }
LinkEntry { source, target, line, context }
SearchResult { path, title, matches: {line, text}[], score }
```

---

## 4. Renderer Architecture

### React Component Tree

```
src/renderer/main.tsx
|
+-> ReactDOM.createRoot('#root').render(<App />)
    |
    +-> App.tsx
        |
        |  reads from useVaultStore():
        |    vaultPath, fileTree, activeFile, activeContent,
        |    backlinks, showSearch, showGraph,
        |    sidebarVisible, rightPanelVisible
        |
        |  uses hooks:
        |    useVault() --> loadVault, openNote, saveNote,
        |                   refreshVault, navigateToLink
        |
        +-- <FileExplorer>                     (left sidebar)
        |     props: fileTree, activeFile,
        |            onFileClick, onRefresh
        |     |
        |     +-- <FileTreeItem> (recursive)
        |           props: node, depth, activeFile,
        |                  onFileClick, onContextMenu,
        |                  onDragStart, onDrop
        |
        +-- <div.resize-handle>                (draggable divider: sidebar | center)
        |     mousedown -> onResizeSidebar
        |
        +-- <div.center-panel>
        |     |
        |     +-- <EditorToolbar>               (when activeFile set)
        |     |     props: onAction
        |     |
        |     +-- <MarkdownEditor>              (when activeFile set)
        |           props: content, filePath,
        |                  onContentChange, onNavigate
        |           |
        |           reads store: vaultPath, noteNames
        |           |
        |           +-- EditorView (CodeMirror 6)
        |                 extensions:
        |                   wikiLinkPlugin        (cm-wiki-link.ts)
        |                   wikiLinkAutocomplete  (cm-autocomplete.ts)
        |                   smartEditExtensions   (cm-smart-edit.ts)
        |                   createDropHandler     (cm-drop-handler.ts)
        |
        +-- <div.resize-handle>                (draggable divider: center | right-panel)
        |     mousedown -> onResizeRightPanel
        |
        +-- <div.right-panel>
        |     |
        |     +-- <GraphView>                   (when showGraph)
        |     |     props: activeFile, onNavigate
        |     |     uses: d3-force, d3-selection, d3-zoom
        |     |
        |     +-- <BacklinksPanel>              (when !showGraph)
        |           props: backlinks, onNavigate
        |
        +-- <SearchPanel>                       (when showSearch, modal overlay)
              props: onClose, onOpenNote
              local debounce: 200ms -> window.api.search()
```

### Hooks Layer

```
+------------------+    +------------------+    +------------------+
|   useVault.ts    |    |   useLinks.ts    |    |   useSearch.ts   |
|                  |    |                  |    |                  |
| loadVault()      |    | refreshBacklinks |    | search()         |
| openNote()       |    |  -> getBacklinks |    |  -> api.search   |
| saveNote()       |    |  -> setBacklinks |    |  -> setResults   |
| refreshVault()   |    |                  |    |  -> setQuery     |
| navigateToLink() |    +------------------+    +------------------+
|                  |
| useEffect:       |
|   onFileChanged  |
|   onFileAdded    |
|   onFileRemoved  |
+------------------+
         |
         v
  useVaultStore (Zustand)
```

---

## 5. IPC Communication Flow

### a) Vault Opening Flow

```
User clicks "Open Vault" button (App.tsx line 126)
         |
         v
window.api.selectVault()
         |
         v  [ipcRenderer.invoke('vault:select')]
         |
+--------+--------+
|   MAIN PROCESS  |
|                 |
| dialog.showOpenDialog({ properties: ['openDirectory'] })
|                 |
| saveConfig({ vaultPath })  --> ~/.nexusnotes/config.json
|                 |
| return vaultPath
+--------+--------+
         |
         v
App.tsx: loadVault(vaultPath)    [useVault.ts line 7]
         |
         +-> store.setVaultPath(vaultPath)
         |
         +-> window.api.openVault(vaultPath)
         |       |
         |       v  [ipcRenderer.invoke('fs:openVault', dirPath)]
         |       |
         |   +---+---------------+
         |   |   MAIN PROCESS    |
         |   |                   |
         |   | FileService.openVault(dirPath)
         |   |   --> buildTree() recursive walk
         |   |   --> returns FileNode tree
         |   |                   |
         |   | FileService.listAllNotes(dirPath)
         |   |   --> recursive walk, .md only
         |   |                   |
         |   | linkIndex.buildIndex(dirPath, notes)
         |   |   --> name->path map
         |   |   --> parse every file for [[links]]
         |   |                   |
         |   | searchService.buildIndex(dirPath, notes)
         |   |   --> read all files
         |   |   --> miniSearch.addAll(docs)
         |   |                   |
         |   | return FileNode tree
         |   +---+---------------+
         |       |
         +-> store.setFileTree(tree)
         |
         +-> window.api.startWatching(vaultPath)
         |       |
         |       v  [ipcRenderer.invoke('vault:startWatching', vaultPath)]
         |       |
         |   +---+---------------+
         |   |   MAIN PROCESS    |
         |   |   new WatcherService(vaultPath, mainWindow)
         |   +---+---------------+
         |
         +-> window.api.getAllNoteNames()
         |       --> linkIndex.getAllNoteNames()
         |
         +-> store.setNoteNames(names)
                   |
                   v
         FileExplorer renders fileTree
         MarkdownEditor autocomplete knows note names
```

### b) File Editing Flow

```
User types in MarkdownEditor
         |
         v
CodeMirror EditorView.updateListener fires
(MarkdownEditor.tsx line 92-96)
         |
         v
update.docChanged === true
         |
         v
onContentChange(newContent)   [prop from App.tsx]
         |
         +-> useVaultStore.getState().setActiveContent(content)
         |     --> React re-renders with new content (no disk I/O yet)
         |
         +-> clearTimeout(saveTimerRef.current)
         +-> saveTimerRef.current = setTimeout(() => {
               saveNote(activeFile, content)   // 300ms debounce
             }, 300)
                   |
                   v
           window.api.writeNote(filePath, content)
                   |
                   v  [ipcRenderer.invoke('fs:writeNote', filePath, content)]
                   |
           +-------+-------+
           |  MAIN PROCESS |
           |               |
           | FileService.writeNote(filePath, content)
           |   --> fs.writeFileSync
           |               |
           | linkIndex.parseFileLinks(filePath)
           |   --> re-scan [[links]] in this file
           |               |
           | searchService.updateNote(filePath)
           |   --> discard old doc + re-add
           +-------+-------+
                   |
         NOTE: WatcherService will detect this write via chokidar
         but awaitWriteFinish.stabilityThreshold=100ms means the
         event fires ~100ms after the write completes.
         The renderer's useVault useEffect (line 52-58) re-reads
         the file only if it is the activeFile -- creating a brief
         redundant read that is harmless since content matches.
```

### c) Wiki-Link Navigation Flow

```
User Ctrl+clicks on [[NoteTitle]] in editor
         |
         v
MarkdownEditor.tsx click handler (line 133-153)
  target.classList.contains('cm-wiki-link')
         |
         v
Extract link name from line text via regex
         |
         v
onNavigate(linkName)   [prop: navigateToLink from useVault.ts]
         |
         v
window.api.resolveLink(linkName)
         |
         v  [ipcRenderer.invoke('links:resolveLink', linkName)]
         |
+--------+--------+
|  MAIN PROCESS   |
| linkIndex.resolveLink(linkName)
|   --> notesByName.get(linkName.toLowerCase())
|   --> returns absolutePath or null
+--------+--------+
         |
         v
   resolved path?
   /            \
 YES             NO
  |               |
  |          window.api.createNote(vaultPath, linkName)
  |               |  [fs:createNote]
  |               |  FileService.createNote()
  |               |  linkIndex.updateNoteRegistry()
  |               |  searchService.updateNote()
  |               |
  |          refreshVault()  --> re-reads full tree
  |               |
  +-------+-------+
          |
          v
    openNote(resolvedPath)
          |
          +-> window.api.readNote(filePath)
          |       --> fs.readFileSync
          |
          +-> store.setActiveFile(filePath)
          +-> store.setActiveContent(content)
          |
          +-> window.api.getBacklinks(filePath)
          |       --> linkIndex.getBacklinks()
          |
          +-> store.setBacklinks(backlinks)
                    |
                    v
          Editor shows new note
          BacklinksPanel shows its inbound links
```

### d) Search Flow

```
User types in SearchPanel input
         |
         v
handleChange (SearchPanel.tsx line 30)
         |
         +-> setQuery(val)
         |
         +-> clearTimeout(debounceRef.current)
         +-> debounceRef.current = setTimeout(() => {
               doSearch(val)   // 200ms debounce
             }, 200)
                   |
                   v
           window.api.search(query)
                   |
                   v  [ipcRenderer.invoke('search:query', query)]
                   |
           +-------+-------+
           |  MAIN PROCESS |
           |               |
           | searchService.search(query)
           |   miniSearch.search(query, { prefix:true, fuzzy:0.2 })
           |   --> top 20 results by score
           |   --> for each: re-read file to find match lines
           |   --> return SearchResult[]
           +-------+-------+
                   |
                   v
           setResults(r)
           setSelectedIndex(0)
                   |
                   v
           SearchPanel renders result list with highlighted matches

User presses Enter (or clicks a result)
         |
         v
onOpenNote(results[selectedIndex].path)
onClose()
         |
         v
openNote(filePath)  [same as navigation flow above]
```

### e) File Watcher Flow (External Change)

```
External editor modifies a file in the vault
         |
         v
chokidar detects filesystem change
(WatcherService, watcher-service.ts line 33)
         |
         v
debounce(100ms) per "event:filePath" key
         |
         v
mainWindow.webContents.send('vault:file-changed', filePath)
         |
         v  [IPC push, renderer side: ipcRenderer.on('vault:file-changed')]
         |
useVault.ts useEffect listener (line 52-58):
         |
         +-- if filePath === store.activeFile:
         |     window.api.readNote(filePath)
         |       --> fs.readFileSync
         |     store.setActiveContent(content)
         |       --> MarkdownEditor sees new content prop
         |       --> dispatches full replace to EditorView
         |
         +-- window.api.rebuildFileIndex(filePath)
               |
               v  [ipcRenderer.invoke('index:rebuildFile', filePath)]
               |
         +-----+------+
         | MAIN PROC  |
         | linkIndex.updateNoteRegistry(filePath)
         | linkIndex.parseFileLinks(filePath)
         | searchService.updateNote(filePath)
         +-----+------+

For 'vault:file-added':
  refreshVault() --> re-reads full FileNode tree
  store.setFileTree(tree)
  FileExplorer re-renders

For 'vault:file-removed':
  if filePath === store.activeFile:
    store.setActiveFile(null)
    store.setActiveContent('')
  window.api.removeFileIndex(filePath)
  refreshVault()
```

---

## 6. Data Flow Architecture

### Disk to Screen (Read Path)

```
Disk (vault directory)
         |
         | fs.readFileSync / fs.readdirSync / fs.statSync
         v
FileService (src/main/file-service.ts)
  buildTree() -> FileNode tree
  readNote()  -> string content
  listAllNotes() -> string[] paths
         |
         | ipcMain.handle response
         v
IPC boundary (serialized via Electron's structured-clone)
         |
         | ipcRenderer.invoke() Promise resolution
         v
Hooks layer (src/renderer/hooks/)
  useVault.loadVault()  -> calls store.setFileTree, store.setNoteNames
  useVault.openNote()   -> calls store.setActiveFile, store.setActiveContent,
                                  store.setBacklinks
         |
         v
Zustand store (src/renderer/store/vault-store.ts)
  vaultPath, fileTree, activeFile, activeContent, backlinks, noteNames
         |
         | React subscription (useVaultStore selector)
         v
React Components
  FileExplorer   <-- reads fileTree
  MarkdownEditor <-- reads activeContent, vaultPath, noteNames
  BacklinksPanel <-- reads backlinks
  GraphView      <-- calls window.api.getAllLinks() directly on mount
  SearchPanel    <-- local state only (not in Zustand store)
```

### Screen to Disk (Write Path)

```
User types keystroke
         |
         v
CodeMirror EditorView internal state update
         |
         | EditorView.updateListener (MarkdownEditor.tsx line 92)
         v
onContentChange(newContent)  [App.tsx handleContentChange, line 42]
         |
         +-> store.setActiveContent(content)   [immediate, synchronous]
         |
         +-> debounce 300ms
                   |
                   v
           useVault.saveNote(activeFile, content)
                   |
                   v
           window.api.writeNote(filePath, content)
                   |
                   v [IPC invoke]
           FileService.writeNote()
             --> fs.mkdirSync (if needed)
             --> fs.writeFileSync(filePath, content, 'utf-8')
                   |
                   v
           linkIndex.parseFileLinks()
           searchService.updateNote()
                   |
                   v
           Disk updated; indexes updated
```

---

## 7. CodeMirror Extension Architecture

All four custom extensions plug into a single `EditorState` created once on component mount (MarkdownEditor.tsx line 99-125). The editor instance is never recreated when the file changes — only the document content is replaced via `view.dispatch` (line 172-179).

```
EditorState.create({ extensions: [ ... ] })
|
+-- Standard CM6 extensions:
|     lineNumbers()
|     highlightActiveLine()
|     highlightSpecialChars()
|     drawSelection()
|     bracketMatching()
|     history()
|     syntaxHighlighting(defaultHighlightStyle)
|     highlightSelectionMatches()
|     markdown()                   <-- @codemirror/lang-markdown
|     darkTheme                    <-- custom EditorView.theme(...)
|     keymap([defaultKeymap, historyKeymap, searchKeymap, indentWithTab])
|     EditorView.lineWrapping
|     EditorView.updateListener    <-- triggers onContentChange
|
+-- Custom extension 1: wikiLinkPlugin
|   (src/renderer/components/Editor/cm-wiki-link.ts)
|   |
|   ViewPlugin.fromClass({ decorations })
|   |
|   +-- buildDecorations(view):
|         for each visible range:
|           scan for /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
|           add Decoration.mark({ class: 'cm-wiki-link' })
|             to each match span
|   |
|   +-- update(update):
|         if docChanged or viewportChanged -> rebuild decorations
|   |
|   Ctrl+click handling done separately in MarkdownEditor.tsx (line 133-153):
|     view.dom.addEventListener('click', clickHandler)
|     clickHandler: if Ctrl key held and target.classList has 'cm-wiki-link'
|       -> find position -> extract linkName -> onNavigate(linkName)
|
+-- Custom extension 2: wikiLinkAutocomplete
|   (src/renderer/components/Editor/cm-autocomplete.ts)
|   |
|   autocompletion({ override: [completionSource] })
|   |
|   completionSource(context):
|     look back on current line for "[["
|     if found and not yet closed with "]]":
|       query = text after "[["
|       from  = position after "[["
|       options = noteNames.filter(name.includes(query))
|                          .slice(0, 20)
|                          .map({ label: name, apply: name + ']]' })
|     getNoteNames() is a stable callback from MarkdownEditor
|       that reads from useVaultStore.noteNames
|
+-- Custom extension 3: smartEditExtensions
|   (src/renderer/components/Editor/cm-smart-edit.ts)
|   |
|   +-- keymap.of(smartEditKeymap):
|   |     Enter      -> handleEnterInList()
|   |                    continues bullet (-/*), numbered, checkbox lists
|   |                    empty list item removes the marker (exit list)
|   |     Tab        -> handleTabInList(indent=true)
|   |                    adds "  " prefix to list items
|   |     Shift-Tab  -> handleTabInList(indent=false)
|   |                    removes 2 leading spaces from list items
|   |     Mod-b      -> toggleBold()    wraps/unwraps **
|   |     Mod-i      -> toggleItalic()  wraps/unwraps *
|   |     Mod-k      -> insertLink()    inserts [text](url) or [](url)
|   |     Mod-Shift-k -> insertCodeBlock() inserts ``` block
|   |     Mod-Enter  -> toggleCheckbox()  toggles [ ] <-> [x]
|   |
|   +-- smartPasteExtension (EditorView.domEventHandlers):
|   |     paste event: if selection active and pasted text is URL
|   |       -> preventDefault + wrap as [selected](url)
|   |
|   +-- checkboxClickExtension (EditorView.domEventHandlers):
|         mousedown: if click coords hit a [ ] or [x] token
|           -> toggle state in-place via view.dispatch
|
+-- Custom extension 4: createDropHandler(getVaultPath)
    (src/renderer/components/Editor/cm-drop-handler.ts)
    |
    EditorView.domEventHandlers({ drop, dragover })
    |
    +-- drop event:
    |     if event.dataTransfer.files:
    |       for each file:
    |         image (png/jpg/jpeg/gif/svg/webp):
    |           window.api.copyAttachment(filePath, vaultPath)
    |           insert "![[savedName]]" at drop position
    |         pdf:
    |           same as image
    |         .md file:
    |           insert "[[noteName]]" (no copy)
    |     if event.dataTransfer text is URL:
    |       insert "[link](url)" at drop position
    |
    +-- dragover event:
          preventDefault() to allow drop
```

---

## 8. State Management Architecture

Nexus Notes uses a single **Zustand** store (`src/renderer/store/vault-store.ts`). There is no React Context, no Redux, no prop drilling for global state — components subscribe directly to store slices via selector functions.

```
+==============================================================+
|              useVaultStore  (Zustand)                        |
|                                                              |
|  VAULT IDENTITY                                              |
|  +--------------------------+                                |
|  | vaultPath: string | null | <-- set by useVault.loadVault  |
|  +--------------------------+                                |
|                                                              |
|  FILE TREE                                                   |
|  +--------------------------+                                |
|  | fileTree: FileNode | null| <-- set by openVault/refresh   |
|  +--------------------------+                                |
|                                                              |
|  ACTIVE EDITOR STATE                                         |
|  +--------------------------+                                |
|  | activeFile: string | null| <-- set by openNote()          |
|  | activeContent: string    | <-- set by openNote + typing   |
|  +--------------------------+                                |
|                                                              |
|  LINK DATA                                                   |
|  +--------------------------+                                |
|  | backlinks: LinkEntry[]   | <-- set by openNote()          |
|  | noteNames: string[]      | <-- set by loadVault/refresh   |
|  +--------------------------+                                |
|                                                              |
|  SEARCH STATE                                                |
|  +--------------------------+                                |
|  | searchResults: Result[]  | <-- set by useSearch.search()  |
|  | searchQuery: string      | <-- set by useSearch.search()  |
|  | showSearch: boolean      | <-- toggled by toggleSearch()  |
|  +--------------------------+                                |
|                                                              |
|  UI VISIBILITY FLAGS                                         |
|  +--------------------------+                                |
|  | showGraph: boolean       | <-- toggled by toggleGraph()   |
|  | sidebarVisible: boolean  | <-- toggled by toggleSidebar() |
|  | rightPanelVisible: bool  | <-- toggleRightPanel()         |
|  +--------------------------+                                |
+==============================================================+

Component subscriptions (selector pattern):

App.tsx                 useVaultStore()          -- reads everything
FileExplorer.tsx        useVaultStore(s=>s.vaultPath)
MarkdownEditor.tsx      useVaultStore(s=>s.vaultPath)
                        useVaultStore(s=>s.noteNames)
useVault.ts             useVaultStore()          -- full store for actions

Actions that write state:
  setVaultPath(path)     --> used by loadVault
  setFileTree(tree)      --> used by loadVault, refreshVault
  setActiveFile(path)    --> used by openNote, watcher removal
  setActiveContent(c)    --> used by openNote, handleContentChange, watcher change
  setBacklinks(links)    --> used by openNote
  setSearchResults(r)    --> used by useSearch
  setSearchQuery(q)      --> used by useSearch
  setNoteNames(names)    --> used by loadVault, refreshVault
  toggleSearch()         --> used by App keyboard shortcut, SearchPanel close
  toggleGraph()          --> used by App keyboard shortcut, right-panel tabs
  toggleSidebar()        --> used by App toggle button
  toggleRightPanel()     --> used by App toggle button
  openDailyNote()        --> used by App keyboard shortcut (Ctrl+D)
```

**Why `useVaultStore.getState()` is used in `handleContentChange`:**

`App.tsx` line 43 calls `useVaultStore.getState().setActiveContent(content)` rather than reading the setter through the hook. This avoids capturing a stale setter reference in the debounced callback's closure. The Zustand `getState()` always returns the current store instance.

---

## 9. Component Communication Patterns

### Pattern A: Parent-to-Child Prop Flow

```
App.tsx  (orchestrator)
|
|  fileTree -----------------------> FileExplorer
|  activeFile ---------------------> FileExplorer
|  onFileClick (openNote) ---------> FileExplorer
|  onRefresh (refreshVault) -------> FileExplorer
|                                         |
|                              node, depth, activeFile,
|                              onFileClick, onContextMenu,
|                              onDragStart, onDrop
|                                         |
|                                    FileTreeItem (recursive)
|
|  content (activeContent) --------> MarkdownEditor
|  filePath (activeFile) ----------> MarkdownEditor
|  onContentChange ----------------> MarkdownEditor
|  onNavigate (navigateToLink) ----> MarkdownEditor
|
|  onAction (handleToolbarAction) -> EditorToolbar
|
|  backlinks ----------------------> BacklinksPanel
|  onNavigate (openNote) ----------> BacklinksPanel
|
|  activeFile ---------------------> GraphView
|  onNavigate (navigateToLink) ----> GraphView
|
|  onClose (toggleSearch) ---------> SearchPanel
|  onOpenNote (openNote) ----------> SearchPanel
```

### Pattern B: Zustand Store Subscription

Components subscribe to specific slices. React only re-renders a component when its subscribed slice changes.

```
+------------------+       selector         +------------------+
|    Component     |  useVaultStore(s=>...) |   Zustand Store  |
+------------------+                        +------------------+
                                                      ^
                                                      | store.setX(val)
                                                      |
                                            +------------------+
                                            |      Hook        |
                                            | (useVault, etc.) |
                                            +------------------+
```

Example — MarkdownEditor subscribes to only `vaultPath` and `noteNames`:

```typescript
// src/renderer/components/Editor/MarkdownEditor.tsx  lines 82-83
const vaultPath  = useVaultStore((s) => s.vaultPath)
const noteNames  = useVaultStore((s) => s.noteNames)
```

When the active file changes, `activeContent` changes in the store but MarkdownEditor does not re-render from the store subscription — it receives the new content through the `content` prop from App.tsx (which does subscribe to `activeContent`).

### Pattern C: IPC Call Chain

The full path from a component action to the main process and back:

```
Component                 Preload (window.api)       Main Process
    |                           |                         |
    | window.api.writeNote(     |                         |
    |   filePath, content)      |                         |
    +-------------------------->|                         |
                                | ipcRenderer.invoke(     |
                                |   'fs:writeNote',       |
                                |   filePath, content)    |
                                +------------------------>|
                                                          | ipcMain.handle(
                                                          |   'fs:writeNote',
                                                          |   handler)
                                                          |
                                                          | FileService.writeNote()
                                                          | linkIndex.parseFileLinks()
                                                          | searchService.updateNote()
                                                          |
                                <-------------------------+
                                | Promise resolves         |
    <---------------------------+                         |
    | await resolved (void)     |                         |
```

**Push events** (watcher notifications) flow in the opposite direction without a request:

```
Main Process              Preload (window.api)       Component (useVault.ts)
    |                           |                         |
    | mainWindow.webContents    |                         |
    | .send('vault:file-        |                         |
    |   changed', filePath)     |                         |
    +-------------------------->|                         |
                                | ipcRenderer.on(         |
                                |   'vault:file-changed', |
                                |   handler)              |
                                +------------------------>|
                                                          | callback(filePath)
                                                          | -> readNote / setContent
                                                          | -> rebuildFileIndex
```

---

## 10. File System Architecture

### Vault Directory Structure

```
{vaultPath}/                     <-- user-chosen root
|
+-- Note One.md                  <-- flat notes at root
+-- Note Two.md
|
+-- Projects/                    <-- subdirectory
|     +-- Project Alpha.md
|     +-- Project Beta.md
|
+-- Reference/
|     +-- Books.md
|     +-- People.md
|
+-- Attachments/                 <-- auto-created by FileService.copyAttachment()
      +-- image.png
      +-- document.pdf
      +-- image-1700000000000.png  <-- collision-renamed copy
```

Dot-files and dot-directories are excluded at two levels:
1. `FileService.buildTree` filters `f.startsWith('.')` (file-service.ts line 17).
2. `WatcherService` chokidar `ignored: /(^|[/\\])\./` (watcher-service.ts line 11).

The config directory `~/.nexusnotes/` is stored outside the vault and is never watched or indexed.

### FileNode Tree Mapping to Disk

```
Disk                              FileNode tree (in memory)
------------------------------------------------------------------
{vault}/                          { name:'vault', type:'directory',
|                                   path:'/abs/vault',
+-- Projects/                       children: [
|     +-- Alpha.md                    { name:'Projects', type:'directory',
+-- Note.md                             path:'/abs/vault/Projects',
                                        children: [
                                          { name:'Alpha.md', type:'file',
                                            path:'/abs/vault/Projects/Alpha.md' }
                                        ]
                                      },
                                      { name:'Note.md', type:'file',
                                        path:'/abs/vault/Note.md' }
                                    ]
                                  }
```

Sort order: directories before files within each level, then alphabetical by name (file-service.ts lines 19-21).

FileExplorer renders only `fileTree.children` (the root node itself is not displayed — only its contents).

### Attachment Handling Flow

```
User drags image onto MarkdownEditor
           |
           v
cm-drop-handler.ts: drop event
  file extension is image (.png/.jpg/etc.) or .pdf
           |
           v
window.api.copyAttachment(sourcePath, vaultPath)
           |
           v  [IPC: fs:copyAttachment]
           |
FileService.copyAttachment(sourcePath, vaultPath):
  attachDir = path.join(vaultPath, 'Attachments')
  mkdirSync(attachDir, { recursive: true })   <-- auto-create
  destPath = path.join(attachDir, fileName)
  if exists: destPath = base + '-' + Date.now() + ext
  fs.copyFileSync(sourcePath, destPath)
  return path.basename(destPath)              <-- just the filename
           |
           v
editor inserts: ![[returnedFilename]]
```

### File Watching Scope

```
chokidar.watch(vaultPath, ...)
  |
  +-- INCLUDED: everything under vaultPath not starting with '.'
  |     {vault}/**/*.md        <-- notes
  |     {vault}/Attachments/** <-- attachments (triggers file-added)
  |
  +-- EXCLUDED:
        .git/, .obsidian/, etc. (dot-directories)
        dot-files
  |
  +-- ignoreInitial: true
  |     no events fired for files that exist at watch-start time
  |
  +-- awaitWriteFinish.stabilityThreshold: 100ms
        event fires only after file size stops changing for 100ms
        prevents partial-write events during app's own fs:writeNote calls
```

---

## 11. Link System Architecture

### Data Structures

```
LinkIndex (src/main/link-index.ts)

notesByName: Map<string, string>
  key:   lowercase note name without extension ("project alpha")
  value: absolute file path ("/vault/Projects/Project Alpha.md")
  rule:  on name collision, shorter path wins (line 22)

forwardLinks: Map<string, string[]>
  key:   absolute path of source note
  value: array of target paths (resolved) OR target names (unresolved)

backLinks: Map<string, LinkEntry[]>
  key:   absolute path of target note
  value: array of LinkEntry {
           source:  absolute path of note containing the link
           target:  absolute path of this note
           line:    1-based line number of the [[link]]
           context: full trimmed text of that line
         }
```

### Link Resolution Algorithm

```
Input: linkName = "Project Alpha"   (text inside [[ ]])

linkIndex.resolveLink("Project Alpha")
  |
  +-> notesByName.get("project alpha")   <-- lowercased
  |
  FOUND?
  /       \
YES        NO
  |         |
  return     return null
  absPath    |
             v
         useVault.navigateToLink():
           window.api.createNote(vaultPath, linkName)
             --> FileService.createNote creates empty .md
             --> linkIndex.updateNoteRegistry adds to notesByName
           refreshVault() updates fileTree
           openNote(newPath) opens the new empty note
```

### Forward and Backward Link Maps

```
Vault state:
  Alpha.md contains: "See also [[Beta]] and [[Gamma]]"
  Beta.md  contains: "Described in [[Alpha]]"
  Gamma.md contains: (no links)

forwardLinks:
  Alpha.md -> [ Beta.md, Gamma.md ]
  Beta.md  -> [ Alpha.md ]
  Gamma.md -> []

backLinks:
  Alpha.md -> [ LinkEntry{ source:Beta.md, line:1, context:"Described in [[Alpha]]" } ]
  Beta.md  -> [ LinkEntry{ source:Alpha.md, line:1, context:"See also [[Beta]] and [[Gamma]]" } ]
  Gamma.md -> [ LinkEntry{ source:Alpha.md, line:1, context:"See also [[Beta]] and [[Gamma]]" } ]
```

### Backlinks Panel Data Flow

```
openNote(filePath) called in useVault.ts
           |
           v
window.api.getBacklinks(filePath)
           |
           v  [IPC: links:getBacklinks]
           |
linkIndex.getBacklinks(filePath)
  returns: backLinks.get(filePath) || []
           |
           v
store.setBacklinks(backlinks)
           |
           v
App.tsx reads backlinks from store
  passes as prop to <BacklinksPanel backlinks={backlinks} />
           |
           v
BacklinksPanel groups LinkEntry[] by source:
  { [sourcePath]: LinkEntry[] }
  renders each group as:
    - Clickable source name -> onNavigate(sourcePath) -> openNote
    - Context lines (link.context) as preview text
```

### GraphView Link Fetching

GraphView does not use the Zustand store for link data. It fetches directly on mount (and whenever `activeFile` changes):

```
GraphView useEffect -> buildGraph()
  |
  +-> window.api.getAllLinks()       -> linkIndex.getAllLinks()
  |     returns: { source, target }[]  (resolved links only)
  |
  +-> window.api.getAllNoteNames()   -> linkIndex.getAllNoteNames()
  |
  +-> window.api.listAllNotes(savedVault)
  |     all .md file paths for building node set
  |
  D3 force simulation:
    nodes: one per note file
    links: one per resolved forward link
    active node: larger radius (8px vs 5px)
    connected nodes: different CSS class
    node click -> onNavigate(node.id)  -> navigateToLink(absolutePath)
```

Note: `onNavigate` in `GraphView` is `navigateToLink` from `useVault`, which calls `resolveLink` first. But `GraphView` passes `node.id` which is already an absolute path, and `resolveLink` does a name lookup. This means graph node clicks may create a new note if the absolute path is not in `notesByName`. In practice this is harmless because the note exists on disk, but it is an edge case where the path is used as a name lookup key.

---

## 12. Build and Packaging Architecture

### electron-vite Build Pipeline

```
electron.vite.config.ts
+-------------------------------------------------------+
|  defineConfig({                                        |
|    main: {                                             |
|      plugins: [externalizeDepsPlugin()]                |
|      // externalizes node_modules from bundle          |
|      // input: src/main/index.ts (default)             |
|      // output: out/main/index.js                      |
|    },                                                  |
|    preload: {                                          |
|      plugins: [externalizeDepsPlugin()]                |
|      // input: src/preload/index.ts (default)          |
|      // output: out/preload/index.js                   |
|    },                                                  |
|    renderer: {                                         |
|      plugins: [react()]   // @vitejs/plugin-react      |
|      resolve: {                                        |
|        alias: { '@renderer': 'src/renderer' }         |
|      }                                                 |
|      // input: src/renderer/index.html                 |
|      // output: out/renderer/index.html + assets       |
|    }                                                   |
|  })                                                    |
+-------------------------------------------------------+
```

### Source to Output Mapping

```
Source                                Output (npm run build)
--------------------------------------------------------------
src/main/index.ts          -->  out/main/index.js
src/main/file-service.ts   -->  (bundled into out/main/index.js)
src/main/watcher-service.ts-->  (bundled into out/main/index.js)
src/main/link-index.ts     -->  (bundled into out/main/index.js)
src/main/search-service.ts -->  (bundled into out/main/index.js)
src/main/ipc-handlers.ts   -->  (bundled into out/main/index.js)
src/main/types.ts          -->  (bundled into out/main/index.js)

src/preload/index.ts       -->  out/preload/index.js

src/renderer/main.tsx      -->  out/renderer/assets/main-[hash].js
src/renderer/App.tsx       -->  (bundled into renderer chunk)
src/renderer/store/*.ts    -->  (bundled into renderer chunk)
src/renderer/hooks/*.ts    -->  (bundled into renderer chunk)
src/renderer/components/   -->  (bundled into renderer chunk)
src/renderer/styles/       -->  out/renderer/assets/[name]-[hash].css
src/renderer/index.html    -->  out/renderer/index.html

node_modules (renderer):   -->  out/renderer/assets/vendor-[hash].js
  react, react-dom, zustand,      (code-split by Vite)
  @codemirror/*, d3-*
```

`externalizeDepsPlugin()` for main/preload means node_modules are NOT bundled — they are loaded at runtime from the app's `node_modules` directory. This is correct for Electron's main process which has full Node.js access.

### Build Scripts

```
npm run dev          --> electron-vite dev
                         Starts Vite dev server for renderer (HMR)
                         Compiles main/preload with watch mode
                         Launches Electron pointing at dev server URL

npm run build        --> electron-vite build
                         Compiles all three targets to out/

npm run build:win    --> npm run build && electron-builder --win
npm run build:mac    --> npm run build && electron-builder --mac
npm run build:linux  --> npm run build && electron-builder --linux
npm run build:unpack --> npm run build && electron-builder --dir
                         (unpacked for debugging, no installer)
```

### electron-builder Packaging Flow

```
electron-builder configuration (package.json "build" key)
|
+-- appId:       "com.nexusnotes.app"
+-- productName: "Nexus Notes"
|
+-- files: ["out/**/*"]
|     Packages everything in out/ (main, preload, renderer)
|     plus node_modules that main/preload reference at runtime
|
+-- Platform targets:
|     win:   nsis      --> NexusNotes-Setup-1.0.0.exe
|     mac:   dmg       --> NexusNotes-1.0.0.dmg
|     linux: AppImage  --> NexusNotes-1.0.0.AppImage
|
+-- buildResources: "resources/"
      Icon files for each platform are expected here
      (icon.ico for Windows, icon.icns for macOS, icon.png for Linux)

Packaged application structure:
  win-unpacked/
  |-- NexusNotes.exe              <-- Electron runtime
  |-- resources/
  |     +-- app.asar              <-- all out/ files archived
  |           +-- out/main/index.js
  |           +-- out/preload/index.js
  |           +-- out/renderer/index.html
  |           +-- out/renderer/assets/
  |           +-- node_modules/   <-- runtime deps (chokidar, minisearch, etc.)
  |-- ...Electron framework DLLs
```

### TypeScript Configuration

Three `tsconfig` files divide responsibilities:

```
tsconfig.json          -- root config, references the two below
tsconfig.node.json     -- main + preload: targets Node.js/Electron main
                          module: CommonJS (or ESNext per electron-vite)
                          types: ["node"]
tsconfig.web.json      -- renderer: targets browser/Chromium
                          module: ESNext
                          types: ["node"] for Electron preload types
                          jsx: react-jsx
```

`@electron-toolkit/tsconfig` provides base tsconfig settings tuned for Electron development.

---

## Appendix: Key File Index

| File | Role | Key Exports |
|---|---|---|
| `src/main/index.ts` | App bootstrap, BrowserWindow, config persistence | `createWindow`, `loadConfig`, `saveConfig` |
| `src/main/file-service.ts` | All disk I/O (static class) | `FileService` |
| `src/main/watcher-service.ts` | chokidar watcher, debounced push events | `WatcherService` |
| `src/main/link-index.ts` | Bidirectional wiki-link graph, in-memory | `LinkIndex` |
| `src/main/search-service.ts` | MiniSearch full-text search | `SearchService` |
| `src/main/ipc-handlers.ts` | Wires all ipcMain.handle channels | `registerIpcHandlers` |
| `src/main/types.ts` | FileNode, LinkEntry, SearchResult | (interfaces) |
| `src/preload/index.ts` | contextBridge, typed window.api | `api`, `Api` |
| `src/renderer/main.tsx` | React entry point | (side effect) |
| `src/renderer/App.tsx` | Root component, layout, keyboard shortcuts | `App` |
| `src/renderer/store/vault-store.ts` | Zustand global state | `useVaultStore` |
| `src/renderer/hooks/useVault.ts` | Vault lifecycle, file watcher listeners | `useVault` |
| `src/renderer/hooks/useLinks.ts` | Backlink refresh helper | `useLinks` |
| `src/renderer/hooks/useSearch.ts` | Search debounce + store update | `useSearch` |
| `src/renderer/lib/types.ts` | Renderer-side type mirror | (interfaces) |
| `src/renderer/lib/api.ts` | Re-export of window.api | `api` |
| `src/renderer/components/Editor/MarkdownEditor.tsx` | CodeMirror 6 host component | `MarkdownEditor` |
| `src/renderer/components/Editor/cm-wiki-link.ts` | ViewPlugin decoration for [[links]] | `wikiLinkPlugin` |
| `src/renderer/components/Editor/cm-autocomplete.ts` | [[link]] autocomplete source | `wikiLinkAutocomplete` |
| `src/renderer/components/Editor/cm-smart-edit.ts` | Smart list/format keyboard bindings | `smartEditExtensions` |
| `src/renderer/components/Editor/cm-drop-handler.ts` | Drag-and-drop file/URL handler | `createDropHandler` |
| `src/renderer/components/Sidebar/FileExplorer.tsx` | Sidebar with tree, context menu, drag-drop | `FileExplorer` |
| `src/renderer/components/Sidebar/FileTreeItem.tsx` | Recursive tree node | `FileTreeItem` |
| `src/renderer/components/GraphView.tsx` | D3-force link graph | `GraphView` |
| `src/renderer/components/SearchPanel.tsx` | Modal full-text search UI | `SearchPanel` |
| `src/renderer/components/BacklinksPanel.tsx` | Grouped backlink list | `BacklinksPanel` |
| `src/renderer/components/EditorToolbar.tsx` | Formatting toolbar buttons | `EditorToolbar` |
| `electron.vite.config.ts` | Build configuration for all three targets | (default export) |
