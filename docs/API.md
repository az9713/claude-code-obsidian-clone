# Nexus Notes API Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [Type Definitions](#2-type-definitions)
3. [Vault Management API](#3-vault-management-api)
4. [File Operations API](#4-file-operations-api)
5. [Links API](#5-links-api)
6. [Search API](#6-search-api)
7. [Index Management API](#7-index-management-api)
8. [Event API (Watcher Events)](#8-event-api-watcher-events)
9. [IPC Channel Reference Table](#9-ipc-channel-reference-table)
10. [Internal Service APIs](#10-internal-service-apis)

---

## 1. Overview

### Architecture

Nexus Notes is an Electron application that separates its code into two processes that communicate over Inter-Process Communication (IPC):

- **Main process** (`src/main/`) — runs in Node.js, has full filesystem access, manages services.
- **Renderer process** (`src/renderer/`) — runs in a browser context, renders the UI.

These two processes cannot share memory or call each other's functions directly. All communication flows through Electron's IPC bridge.

### How the Renderer Calls the Main Process

The renderer accesses the API exclusively through the global `window.api` object:

```typescript
// Renderer code
const vaultPath = await window.api.selectVault()
const content = await window.api.readNote('/path/to/note.md')
```

Every `window.api` method internally calls `ipcRenderer.invoke(channel, ...args)`, which sends a message to the main process and returns a `Promise` that resolves when the main process replies.

### How the Preload Script Bridges the Gap

The preload script (`src/preload/index.ts`) runs in a privileged context that has access to both the Electron `ipcRenderer` and the DOM. It constructs the `api` object and exposes it to the renderer via `contextBridge.exposeInMainWorld('api', api)`.

```
Renderer (window.api.foo())
        |
        | contextBridge
        v
Preload (ipcRenderer.invoke('channel:foo', args))
        |
        | IPC
        v
Main (ipcMain.handle('channel:foo', handler))
        |
        v
Service (FileService / LinkIndex / SearchService)
```

### Security Model

- **`contextBridge`** — Only the explicitly listed methods in the `api` object are available to the renderer. The renderer cannot access Node.js APIs directly.
- **`nodeIntegration: false`** (default) — The renderer's browser context has no access to Node.js modules.
- **`sandbox: false`** — The preload script runs outside the renderer sandbox so it can use `ipcRenderer`, but it does not expose raw IPC to the renderer.
- **No `remote` module** — All privileged operations go through explicitly registered `ipcMain.handle` channels, making the attack surface explicit and auditable.

---

## 2. Type Definitions

These interfaces are defined in `src/main/types.ts` and mirrored in `src/renderer/lib/types.ts` so both processes share the same shape.

---

### `FileNode`

Represents a node in the vault's file tree. Directories carry their children recursively; files do not.

```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | The base name of the file or directory (e.g., `"My Note.md"`, `"Projects"`). |
| `path` | `string` | Yes | The absolute filesystem path (e.g., `"/home/user/vault/Projects/My Note.md"`). |
| `type` | `'file' \| 'directory'` | Yes | Whether this node is a file or a directory. |
| `children` | `FileNode[]` | No | Present and populated only when `type` is `'directory'`. Absent on file nodes. Directories are sorted before files; within each group, entries are sorted alphabetically. Hidden entries (names beginning with `.`) are excluded. |

**Example:**

```json
{
  "name": "vault",
  "path": "/home/user/vault",
  "type": "directory",
  "children": [
    {
      "name": "Projects",
      "path": "/home/user/vault/Projects",
      "type": "directory",
      "children": [
        {
          "name": "My Note.md",
          "path": "/home/user/vault/Projects/My Note.md",
          "type": "file"
        }
      ]
    },
    {
      "name": "Index.md",
      "path": "/home/user/vault/Index.md",
      "type": "file"
    }
  ]
}
```

---

### `LinkEntry`

Represents a single wiki-link (`[[Target Note]]`) found inside a source note. Used to describe both forward links and backlinks.

```typescript
interface LinkEntry {
  source: string
  target: string
  line: number
  context: string
}
```

| Field | Type | Description |
|---|---|---|
| `source` | `string` | Absolute path of the note that contains the link. |
| `target` | `string` | Absolute path of the note that the link points to. |
| `line` | `number` | 1-based line number inside `source` where the link appears. |
| `context` | `string` | The full trimmed text of the line containing the link, useful for displaying a preview. |

**Example:**

```json
{
  "source": "/home/user/vault/Index.md",
  "target": "/home/user/vault/Projects/My Note.md",
  "line": 5,
  "context": "See also [[My Note]] for details."
}
```

---

### `SearchResult`

Represents a single search hit returned by the full-text search engine.

```typescript
interface SearchResult {
  path: string
  title: string
  matches: { line: number; text: string }[]
  score: number
}
```

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Absolute path to the matching note file. |
| `title` | `string` | The note's title, derived from the filename without the `.md` extension. |
| `matches` | `{ line: number; text: string }[]` | Up to 3 line-level matches. Each entry contains a 1-based `line` number and the trimmed `text` of that line. |
| `score` | `number` | Relevance score from MiniSearch. Higher values indicate stronger matches. Title matches are weighted 2x compared to body matches. |

**Example:**

```json
{
  "path": "/home/user/vault/Projects/My Note.md",
  "title": "My Note",
  "matches": [
    { "line": 3, "text": "This project uses the Nexus Notes API." }
  ],
  "score": 4.72
}
```

---

## 3. Vault Management API

These methods control which vault folder is open and whether the filesystem watcher is running.

---

### `selectVault()`

**Signature:**
```typescript
window.api.selectVault(): Promise<string | null>
```

**Parameters:** None.

**Returns:** `Promise<string | null>` — The absolute path of the selected directory, or `null` if the user cancelled the dialog.

**Description:**
Opens the native OS folder-picker dialog. If the user selects a folder, the path is persisted to the application configuration file (`~/.nexusnotes/config.json`) and returned. Subsequent calls to `getSavedVault()` will return this path.

**Example:**
```typescript
const vaultPath = await window.api.selectVault()
if (vaultPath) {
  await window.api.openVault(vaultPath)
}
```

**Error cases:**
- The dialog cannot fail silently; cancellation returns `null` rather than throwing.

---

### `getSavedVault()`

**Signature:**
```typescript
window.api.getSavedVault(): Promise<string | null>
```

**Parameters:** None.

**Returns:** `Promise<string | null>` — The previously saved vault path, or `null` if none has been saved yet.

**Description:**
Reads the application configuration file and returns the `vaultPath` field. Useful for automatically reopening the last vault when the application launches.

**Example:**
```typescript
const saved = await window.api.getSavedVault()
if (saved) {
  await window.api.openVault(saved)
}
```

**Error cases:**
- If the config file is missing or malformed, returns `null` rather than throwing.

---

### `startWatching(vaultPath)`

**Signature:**
```typescript
window.api.startWatching(vaultPath: string): Promise<boolean>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `vaultPath` | `string` | Absolute path to the vault directory to watch. |

**Returns:** `Promise<boolean>` — Always resolves to `true` on success.

**Description:**
Starts the `WatcherService`, which uses chokidar to monitor the vault directory for filesystem changes. If a watcher is already running (e.g., from a previous call), it is stopped and replaced with a new one watching the provided path.

When changes are detected, the watcher emits IPC events to the renderer (see [Event API](#8-event-api-watcher-events)). Events are debounced with a 100 ms threshold to avoid flooding the renderer with rapid successive changes.

Hidden files and directories (names starting with `.`) are excluded from watching.

**Example:**
```typescript
const vaultPath = '/home/user/vault'
await window.api.openVault(vaultPath)
await window.api.startWatching(vaultPath)
```

**Error cases:**
- If `vaultPath` does not exist, chokidar will begin watching but emit no events until the path is created.

---

### `stopWatching()`

**Signature:**
```typescript
window.api.stopWatching(): Promise<boolean>
```

**Parameters:** None.

**Returns:** `Promise<boolean>` — Always resolves to `true`.

**Description:**
Stops the active `WatcherService` if one is running, cancels all pending debounce timers, and closes the underlying chokidar watcher. After calling this method, no further `vault:file-changed`, `vault:file-added`, or `vault:file-removed` events will be emitted until `startWatching` is called again.

If no watcher is active, the call is a no-op and still resolves to `true`.

**Example:**
```typescript
// Clean up before switching vaults
await window.api.stopWatching()
await window.api.openVault(newVaultPath)
await window.api.startWatching(newVaultPath)
```

---

## 4. File Operations API

These methods perform filesystem operations on notes and folders within the vault. They also keep the link index and search index in sync automatically.

---

### `openVault(dirPath)`

**Signature:**
```typescript
window.api.openVault(dirPath: string): Promise<FileNode>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `dirPath` | `string` | Absolute path to the vault root directory. |

**Returns:** `Promise<FileNode>` — A fully populated `FileNode` tree representing the entire vault directory structure.

**Description:**
Scans the vault directory recursively, builds the `FileNode` tree, and also rebuilds both the link index and the search index from scratch by scanning all `.md` files. This is the primary method to call when opening or switching vaults.

Hidden entries (names starting with `.`) are excluded. Within each directory, subdirectories are listed before files, and both groups are sorted alphabetically.

**Side effects:**
- Rebuilds the `LinkIndex` (all forward links, backlinks, and the name-to-path registry).
- Rebuilds the `SearchService` index (all notes indexed for full-text search).

**Example:**
```typescript
const tree = await window.api.openVault('/home/user/vault')
// tree.children contains top-level files and folders
```

**Error cases:**
- Throws if `dirPath` does not exist or is not a directory.

---

### `readNote(filePath)`

**Signature:**
```typescript
window.api.readNote(filePath: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the `.md` file to read. |

**Returns:** `Promise<string>` — The raw UTF-8 text content of the file.

**Description:**
Reads and returns the full content of a note file. No parsing or transformation is applied; the raw Markdown text is returned as-is.

**Example:**
```typescript
const content = await window.api.readNote('/home/user/vault/Index.md')
console.log(content) // "# Welcome\n\nSee [[My Note]]."
```

**Error cases:**
- Throws if the file does not exist.
- Throws if the path points to a directory.

---

### `writeNote(filePath, content)`

**Signature:**
```typescript
window.api.writeNote(filePath: string, content: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file to write. |
| `content` | `string` | The full UTF-8 text to write. Overwrites any existing content. |

**Returns:** `Promise<void>`

**Description:**
Writes the given content to the file, creating any missing intermediate directories automatically. This completely replaces the file's existing content.

**Side effects:**
- Re-parses the file's wiki-links and updates the `LinkIndex`.
- Re-indexes the file in the `SearchService`.

**Example:**
```typescript
await window.api.writeNote('/home/user/vault/Index.md', '# Welcome\n\nSee [[My Note]].')
```

**Error cases:**
- Throws if the filesystem is read-only or if permissions are insufficient.

---

### `createNote(dirPath, name)`

**Signature:**
```typescript
window.api.createNote(dirPath: string, name: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `dirPath` | `string` | Absolute path to the directory in which to create the note. |
| `name` | `string` | The desired note name. The `.md` extension is appended automatically if not already present. |

**Returns:** `Promise<string>` — The absolute path of the newly created file.

**Description:**
Creates a new empty `.md` file in the specified directory. If `name` already ends with `.md`, the extension is not duplicated.

**Side effects:**
- Registers the new note in the `LinkIndex` name registry.
- Adds the new (empty) note to the `SearchService` index.

**Example:**
```typescript
const newPath = await window.api.createNote('/home/user/vault', 'Meeting Notes')
// newPath === '/home/user/vault/Meeting Notes.md'
```

**Error cases:**
- Throws with the message `"File already exists: <path>"` if a file with the same name already exists in `dirPath`.

---

### `deleteNote(filePath)`

**Signature:**
```typescript
window.api.deleteNote(filePath: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file to delete. |

**Returns:** `Promise<void>`

**Description:**
Deletes a note by moving it to the OS trash/recycle bin (using Electron's `shell.trashItem`). If moving to trash fails for any reason, the file is deleted directly using `fs.unlinkSync` as a fallback.

**Side effects:**
- Removes the note from the `LinkIndex` (its forward links, its backlink entries in other notes, and its name registry entry).
- Removes the note from the `SearchService` index.

**Example:**
```typescript
await window.api.deleteNote('/home/user/vault/Old Note.md')
```

**Error cases:**
- If `shell.trashItem` fails and `fs.unlinkSync` also fails (e.g., file not found), an error is thrown.

---

### `renameNote(oldPath, newPath)`

**Signature:**
```typescript
window.api.renameNote(oldPath: string, newPath: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `oldPath` | `string` | Absolute path to the existing file. |
| `newPath` | `string` | Absolute path for the renamed file (must be in the same directory for a rename; use `moveNote` to change directories). |

**Returns:** `Promise<void>`

**Description:**
Renames a file on disk using `fs.renameSync`. Both paths must reside on the same filesystem volume.

**Side effects:**
- Removes `oldPath` from the `LinkIndex` and `SearchService`.
- Registers `newPath` in the `LinkIndex` name registry.
- Re-parses links in `newPath` and updates the `LinkIndex`.
- Re-indexes `newPath` in the `SearchService`.

**Example:**
```typescript
await window.api.renameNote(
  '/home/user/vault/Draft.md',
  '/home/user/vault/Final Report.md'
)
```

**Error cases:**
- Throws if `oldPath` does not exist.
- Throws if `newPath` already exists (platform-dependent behaviour; on most systems this overwrites the target).

---

### `moveNote(filePath, newDirPath)`

**Signature:**
```typescript
window.api.moveNote(filePath: string, newDirPath: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file to move. |
| `newDirPath` | `string` | Absolute path to the destination directory. |

**Returns:** `Promise<string>` — The absolute path of the file in its new location.

**Description:**
Moves a file to a different directory, preserving its filename. Internally calls `fs.renameSync` with the composed destination path.

**Side effects:**
- Removes `filePath` from the `LinkIndex` and `SearchService`.
- Registers the new path in the `LinkIndex` name registry.
- Re-parses links at the new path and updates the `LinkIndex`.
- Re-indexes the file at its new path in the `SearchService`.

**Example:**
```typescript
const newPath = await window.api.moveNote(
  '/home/user/vault/Note.md',
  '/home/user/vault/Archive'
)
// newPath === '/home/user/vault/Archive/Note.md'
```

**Error cases:**
- Throws if `filePath` does not exist.
- Throws if the source and destination are on different volumes (cross-device rename is not supported by `fs.renameSync`).

---

### `createFolder(dirPath, name)`

**Signature:**
```typescript
window.api.createFolder(dirPath: string, name: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `dirPath` | `string` | Absolute path to the parent directory. |
| `name` | `string` | Name of the new folder to create. |

**Returns:** `Promise<string>` — The absolute path of the created folder.

**Description:**
Creates a new directory at `path.join(dirPath, name)`. If the directory already exists, the call is a no-op and returns the existing path. Intermediate directories are created as needed (`recursive: true`).

**Example:**
```typescript
const folderPath = await window.api.createFolder('/home/user/vault', 'Projects')
// folderPath === '/home/user/vault/Projects'
```

**Error cases:**
- Throws if the parent path is not a directory or permissions are insufficient.

---

### `copyAttachment(sourcePath, vaultPath)`

**Signature:**
```typescript
window.api.copyAttachment(sourcePath: string, vaultPath: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `sourcePath` | `string` | Absolute path to the source file to copy into the vault. |
| `vaultPath` | `string` | Absolute path to the vault root directory. |

**Returns:** `Promise<string>` — The **basename** (filename only, not a full path) of the file as stored inside the vault's `Attachments` folder.

**Description:**
Copies a file into the vault's `Attachments` subdirectory. The `Attachments` directory is created if it does not exist. If a file with the same name already exists in `Attachments`, a timestamp suffix is inserted before the extension (e.g., `image-1712345678901.png`) to avoid overwriting the existing file.

**Example:**
```typescript
const fileName = await window.api.copyAttachment(
  '/home/user/Downloads/diagram.png',
  '/home/user/vault'
)
// fileName === 'diagram.png'  (or 'diagram-1712345678901.png' on collision)
// File is stored at /home/user/vault/Attachments/diagram.png
```

**Error cases:**
- Throws if `sourcePath` does not exist or cannot be read.
- Throws if the vault's `Attachments` directory cannot be created.

---

### `listAllNotes(vaultPath)`

**Signature:**
```typescript
window.api.listAllNotes(vaultPath: string): Promise<string[]>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `vaultPath` | `string` | Absolute path to the vault root directory. |

**Returns:** `Promise<string[]>` — An array of absolute paths to every `.md` file found recursively within the vault. Hidden directories (names starting with `.`) are skipped.

**Description:**
Recursively walks the vault directory tree and collects the paths of all Markdown files. The order of results is determined by the filesystem's directory listing order (typically creation or alphabetical order, platform-dependent).

**Example:**
```typescript
const notes = await window.api.listAllNotes('/home/user/vault')
// ['/home/user/vault/Index.md', '/home/user/vault/Projects/Note.md', ...]
```

**Error cases:**
- Throws if `vaultPath` does not exist or is not a directory.

---

## 5. Links API

These methods query the in-memory link index, which tracks wiki-links (`[[Note Name]]`) between notes.

The link index is built when `openVault` is called and updated incrementally on every write, create, rename, move, or delete operation. Links are resolved by matching the linked name (case-insensitive) against the registry of known note names. When two notes share the same name, the one with the shorter path wins.

---

### `getBacklinks(filePath)`

**Signature:**
```typescript
window.api.getBacklinks(filePath: string): Promise<LinkEntry[]>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the target note. |

**Returns:** `Promise<LinkEntry[]>` — All `LinkEntry` records where another note links to `filePath`.

**Description:**
Returns every wiki-link in the vault that points to the given note. Each entry includes the source note's path, the line number, and the surrounding context text.

**Example:**
```typescript
const backlinks = await window.api.getBacklinks('/home/user/vault/Projects/My Note.md')
// [{ source: '/home/user/vault/Index.md', target: '...', line: 5, context: 'See [[My Note]].' }]
```

**Error cases:**
- Returns an empty array if the file has no backlinks or is not in the index.

---

### `getForwardLinks(filePath)`

**Signature:**
```typescript
window.api.getForwardLinks(filePath: string): Promise<string[]>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the source note. |

**Returns:** `Promise<string[]>` — An array of absolute paths (for resolved links) or lowercase link target names (for unresolved links) that the given note links to.

**Description:**
Returns all wiki-links found in the given note. Resolved links are represented as absolute file paths. Unresolved links (where no note with that name exists in the vault) are stored as the lowercased link target name string.

**Example:**
```typescript
const links = await window.api.getForwardLinks('/home/user/vault/Index.md')
// ['/home/user/vault/Projects/My Note.md', 'nonexistent note']
```

**Error cases:**
- Returns an empty array if the file has no forward links or is not in the index.

---

### `getAllLinks()`

**Signature:**
```typescript
window.api.getAllLinks(): Promise<{ source: string; target: string }[]>
```

**Parameters:** None.

**Returns:** `Promise<{ source: string; target: string }[]>` — All resolved links across the entire vault, each as a `{ source, target }` pair of absolute paths.

**Description:**
Returns a flat list of all wiki-link connections between notes that exist on disk. Only links where the target can be resolved to a known note are included; unresolved links are excluded. Useful for building a graph visualisation of note connections.

**Example:**
```typescript
const allLinks = await window.api.getAllLinks()
// [{ source: '/home/user/vault/Index.md', target: '/home/user/vault/Projects/My Note.md' }]
```

---

### `resolveLink(linkName)`

**Signature:**
```typescript
window.api.resolveLink(linkName: string): Promise<string | null>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `linkName` | `string` | The wiki-link target name to resolve (without `[[` and `]]`). Case-insensitive. |

**Returns:** `Promise<string | null>` — The absolute path of the matching note, or `null` if no note with that name exists.

**Description:**
Looks up a note by its display name in the link index registry. The lookup is case-insensitive. When multiple notes share the same name, the one with the shortest path was registered during index build and will be returned.

**Example:**
```typescript
const path = await window.api.resolveLink('My Note')
// '/home/user/vault/Projects/My Note.md'

const missing = await window.api.resolveLink('Does Not Exist')
// null
```

---

### `getAllNoteNames()`

**Signature:**
```typescript
window.api.getAllNoteNames(): Promise<string[]>
```

**Parameters:** None.

**Returns:** `Promise<string[]>` — An array of all registered note names in lowercase (without the `.md` extension).

**Description:**
Returns the keys of the internal name-to-path registry. Useful for autocomplete when the user types a wiki-link, or to check which names are in use.

**Example:**
```typescript
const names = await window.api.getAllNoteNames()
// ['index', 'my note', 'meeting notes']
```

---

## 6. Search API

---

### `search(query)`

**Signature:**
```typescript
window.api.search(query: string): Promise<SearchResult[]>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `query` | `string` | The search query string. |

**Returns:** `Promise<SearchResult[]>` — Up to 20 `SearchResult` objects, sorted by descending relevance score.

**Description:**
Performs a full-text search across all indexed notes using MiniSearch. The search engine supports:

- **Prefix matching** — `"proj"` matches `"projects"`.
- **Fuzzy matching** — Tolerates up to 20% character differences (e.g., `"ntoes"` matches `"notes"`).
- **Title boosting** — Matches in the note's title are weighted 2x compared to body matches.

Each result includes up to 3 line-level snippet matches from the note's content. The search is capped at 20 results.

An empty or whitespace-only query returns an empty array immediately without querying the index.

**Example:**
```typescript
const results = await window.api.search('electron IPC')
results.forEach(r => {
  console.log(r.title, r.score)
  r.matches.forEach(m => console.log(`  Line ${m.line}: ${m.text}`))
})
```

**Error cases:**
- Returns `[]` for blank queries.
- Does not throw; if a file cannot be read for snippet extraction, that file's `matches` will be empty.

---

## 7. Index Management API

These methods allow the renderer to explicitly trigger index updates, typically in response to watcher events.

---

### `rebuildFileIndex(filePath)`

**Signature:**
```typescript
window.api.rebuildFileIndex(filePath: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file whose index entries should be refreshed. |

**Returns:** `Promise<void>`

**Description:**
Refreshes both the link index and the search index for a single file. This is the appropriate method to call when the watcher reports that a file has been added or changed externally (i.e., by a process other than Nexus Notes itself).

Internally, this:
1. Registers or updates the file in the `LinkIndex` name registry.
2. Re-parses wiki-links in the file and updates the `LinkIndex`.
3. Re-indexes the file in the `SearchService`.

**Example:**
```typescript
// Typically called inside an onFileAdded or onFileChanged handler
const cleanup = window.api.onFileAdded(async (filePath) => {
  if (filePath.endsWith('.md')) {
    await window.api.rebuildFileIndex(filePath)
  }
})
```

---

### `removeFileIndex(filePath)`

**Signature:**
```typescript
window.api.removeFileIndex(filePath: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file to remove from all indexes. |

**Returns:** `Promise<void>`

**Description:**
Removes a file from both the link index and the search index. This is the appropriate method to call when the watcher reports that a file has been deleted externally.

Internally, this:
1. Removes the file from the `LinkIndex` name registry, its forward links, and its contribution to other notes' backlinks.
2. Discards the file from the `SearchService` index.

**Example:**
```typescript
const cleanup = window.api.onFileRemoved(async (filePath) => {
  await window.api.removeFileIndex(filePath)
})
```

---

## 8. Event API (Watcher Events)

These methods subscribe to filesystem events emitted by the `WatcherService`. They follow the listener pattern: you pass a callback, and receive a cleanup function to remove the listener.

Events are only emitted when the watcher is active (after `startWatching` is called and before `stopWatching` or app quit).

All events are debounced with a 100 ms window to prevent flooding the renderer with rapid sequential filesystem events (e.g., during a bulk file operation).

---

### `onFileChanged(callback)`

**Event name:** `vault:file-changed`

**Signature:**
```typescript
window.api.onFileChanged(callback: (filePath: string) => void): () => void
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `callback` | `(filePath: string) => void` | Called with the absolute path of the changed file whenever a file's content is modified. |

**Returns:** `() => void` — A cleanup function. Call it to remove the listener and stop receiving events.

**When it fires:** When a watched file's content changes on disk (chokidar `change` event). This includes saves from external editors.

**Example:**
```typescript
const stopListening = window.api.onFileChanged((filePath) => {
  console.log('File changed:', filePath)
  window.api.rebuildFileIndex(filePath)
})

// Later, when the component unmounts:
stopListening()
```

---

### `onFileAdded(callback)`

**Event name:** `vault:file-added`

**Signature:**
```typescript
window.api.onFileAdded(callback: (filePath: string) => void): () => void
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `callback` | `(filePath: string) => void` | Called with the absolute path of the newly added file or directory. |

**Returns:** `() => void` — A cleanup function to remove the listener.

**When it fires:** When a new file or directory appears in the vault (chokidar `add` or `addDir` event). This covers files created externally, moved in from outside the vault, or copied into it.

**Example:**
```typescript
const stopListening = window.api.onFileAdded(async (filePath) => {
  if (filePath.endsWith('.md')) {
    await window.api.rebuildFileIndex(filePath)
    // Refresh sidebar tree
  }
})
```

---

### `onFileRemoved(callback)`

**Event name:** `vault:file-removed`

**Signature:**
```typescript
window.api.onFileRemoved(callback: (filePath: string) => void): () => void
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `callback` | `(filePath: string) => void` | Called with the absolute path of the deleted file or directory. |

**Returns:** `() => void` — A cleanup function to remove the listener.

**When it fires:** When a file or directory is removed from the vault (chokidar `unlink` or `unlinkDir` event). This covers external deletions and moves out of the vault directory.

**Example:**
```typescript
const stopListening = window.api.onFileRemoved(async (filePath) => {
  await window.api.removeFileIndex(filePath)
  // Refresh sidebar tree
})
```

---

### `onShortcut(callback)`

**Event name:** `shortcut` (push from main process)

**Signature:**
```typescript
window.api.onShortcut(callback: (payload: { key: string; ctrl: boolean; shift: boolean; meta: boolean }) => void): () => void
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `callback` | `(payload) => void` | Called with a shortcut descriptor whenever the main process intercepts a Chromium-reserved key combination and forwards it to the renderer. |

**Returns:** `() => void` — A cleanup function. Call it to remove the listener.

**When it fires:** When the user presses a key combination that Chromium would otherwise consume before the renderer sees it (e.g. Ctrl+N, Ctrl+O, Ctrl+G, Ctrl+D, Ctrl+W, Ctrl+Shift+F). The main process intercepts these via `webContents.on('before-input-event')`, prevents the default browser action, and sends a `shortcut` IPC push event to the renderer.

**Payload fields:**

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Lowercase key character (e.g. `'n'`, `'d'`, `'f'`). |
| `ctrl` | `boolean` | Whether the Ctrl key was held. |
| `shift` | `boolean` | Whether the Shift key was held. |
| `meta` | `boolean` | Whether the Meta/Cmd key was held. |

**Example:**
```typescript
const stopListening = window.api.onShortcut((payload) => {
  if (payload.ctrl && payload.key === 'd') {
    openDailyNote()
  }
})

// Later, when the component unmounts:
stopListening()
```

---

## 9. IPC Channel Reference Table

This table maps every `window.api` method to its underlying IPC channel, the handler location, and the internal service method it ultimately calls.

| `window.api` method | IPC channel | Handler location | Service method(s) called |
|---|---|---|---|
| `selectVault()` | `vault:select` | `src/main/index.ts` | `dialog.showOpenDialog`, `saveConfig` |
| `getSavedVault()` | `vault:getSaved` | `src/main/index.ts` | `loadConfig` |
| `startWatching(vaultPath)` | `vault:startWatching` | `src/main/index.ts` | `new WatcherService(...)` |
| `stopWatching()` | `vault:stopWatching` | `src/main/index.ts` | `WatcherService.close()` |
| `openVault(dirPath)` | `fs:openVault` | `src/main/ipc-handlers.ts` | `FileService.openVault`, `LinkIndex.buildIndex`, `SearchService.buildIndex` |
| `readNote(filePath)` | `fs:readNote` | `src/main/ipc-handlers.ts` | `FileService.readNote` |
| `writeNote(filePath, content)` | `fs:writeNote` | `src/main/ipc-handlers.ts` | `FileService.writeNote`, `LinkIndex.parseFileLinks`, `SearchService.updateNote` |
| `createNote(dirPath, name)` | `fs:createNote` | `src/main/ipc-handlers.ts` | `FileService.createNote`, `LinkIndex.updateNoteRegistry`, `SearchService.updateNote` |
| `deleteNote(filePath)` | `fs:deleteNote` | `src/main/ipc-handlers.ts` | `FileService.deleteNote`, `LinkIndex.removeNote`, `SearchService.removeNote` |
| `renameNote(oldPath, newPath)` | `fs:renameNote` | `src/main/ipc-handlers.ts` | `FileService.renameNote`, `LinkIndex.removeNote`, `LinkIndex.updateNoteRegistry`, `LinkIndex.parseFileLinks`, `SearchService.removeNote`, `SearchService.updateNote` |
| `moveNote(filePath, newDirPath)` | `fs:moveNote` | `src/main/ipc-handlers.ts` | `FileService.moveNote`, `LinkIndex.removeNote`, `LinkIndex.updateNoteRegistry`, `LinkIndex.parseFileLinks`, `SearchService.removeNote`, `SearchService.updateNote` |
| `createFolder(dirPath, name)` | `fs:createFolder` | `src/main/ipc-handlers.ts` | `FileService.createFolder` |
| `copyAttachment(sourcePath, vaultPath)` | `fs:copyAttachment` | `src/main/ipc-handlers.ts` | `FileService.copyAttachment` |
| `listAllNotes(vaultPath)` | `fs:listAllNotes` | `src/main/ipc-handlers.ts` | `FileService.listAllNotes` |
| `getBacklinks(filePath)` | `links:getBacklinks` | `src/main/ipc-handlers.ts` | `LinkIndex.getBacklinks` |
| `getForwardLinks(filePath)` | `links:getForwardLinks` | `src/main/ipc-handlers.ts` | `LinkIndex.getForwardLinks` |
| `getAllLinks()` | `links:getAllLinks` | `src/main/ipc-handlers.ts` | `LinkIndex.getAllLinks` |
| `resolveLink(linkName)` | `links:resolveLink` | `src/main/ipc-handlers.ts` | `LinkIndex.resolveLink` |
| `getAllNoteNames()` | `links:getAllNoteNames` | `src/main/ipc-handlers.ts` | `LinkIndex.getAllNoteNames` |
| `search(query)` | `search:query` | `src/main/ipc-handlers.ts` | `SearchService.search` |
| `rebuildFileIndex(filePath)` | `index:rebuildFile` | `src/main/ipc-handlers.ts` | `LinkIndex.updateNoteRegistry`, `LinkIndex.parseFileLinks`, `SearchService.updateNote` |
| `removeFileIndex(filePath)` | `index:removeFile` | `src/main/ipc-handlers.ts` | `LinkIndex.removeNote`, `SearchService.removeNote` |
| `onFileChanged(callback)` | `vault:file-changed` (push) | `src/main/watcher-service.ts` | `mainWindow.webContents.send` |
| `onFileAdded(callback)` | `vault:file-added` (push) | `src/main/watcher-service.ts` | `mainWindow.webContents.send` |
| `onFileRemoved(callback)` | `vault:file-removed` (push) | `src/main/watcher-service.ts` | `mainWindow.webContents.send` |
| `onShortcut(callback)` | `shortcut` (push) | `src/main/index.ts` | `mainWindow.webContents.send` (via `before-input-event`) |

---

## 10. Internal Service APIs

These classes run exclusively in the main process. They are not directly accessible from the renderer — all interaction goes through the IPC layer documented above. This section is a reference for contributors working on the main process.

---

### `FileService`

**File:** `src/main/file-service.ts`

A stateless utility class with only static methods. Handles all direct filesystem operations.

---

#### `FileService.openVault(dirPath)`

```typescript
static async openVault(dirPath: string): Promise<FileNode>
```

Builds and returns the full recursive `FileNode` tree for the given vault path. Hidden entries are excluded. Within each directory, subdirectories are sorted before files, and both groups are sorted alphabetically by name.

---

#### `FileService.readNote(filePath)`

```typescript
static async readNote(filePath: string): Promise<string>
```

Reads and returns the UTF-8 contents of the file at `filePath`.

---

#### `FileService.writeNote(filePath, content)`

```typescript
static async writeNote(filePath: string, content: string): Promise<void>
```

Writes `content` to `filePath` in UTF-8. Creates missing parent directories recursively before writing.

---

#### `FileService.createNote(dirPath, name)`

```typescript
static async createNote(dirPath: string, name: string): Promise<string>
```

Creates a new empty file at `path.join(dirPath, name)` (appending `.md` if needed). Throws if the file already exists. Returns the new file's absolute path.

---

#### `FileService.deleteNote(filePath)`

```typescript
static async deleteNote(filePath: string): Promise<void>
```

Moves `filePath` to the system trash via `shell.trashItem`. Falls back to `fs.unlinkSync` if trash fails.

---

#### `FileService.renameNote(oldPath, newPath)`

```typescript
static async renameNote(oldPath: string, newPath: string): Promise<void>
```

Renames `oldPath` to `newPath` using `fs.renameSync`.

---

#### `FileService.moveNote(filePath, newDirPath)`

```typescript
static async moveNote(filePath: string, newDirPath: string): Promise<string>
```

Moves `filePath` into `newDirPath`, preserving the filename. Returns the new absolute path.

---

#### `FileService.createFolder(dirPath, name)`

```typescript
static async createFolder(dirPath: string, name: string): Promise<string>
```

Creates the directory `path.join(dirPath, name)` recursively. No-ops if it already exists. Returns the folder's absolute path.

---

#### `FileService.copyAttachment(sourcePath, vaultPath)`

```typescript
static async copyAttachment(sourcePath: string, vaultPath: string): Promise<string>
```

Copies `sourcePath` into `<vaultPath>/Attachments/`. Handles filename collisions by appending a timestamp. Returns the basename of the stored file.

---

#### `FileService.listAllNotes(vaultPath)`

```typescript
static async listAllNotes(vaultPath: string): Promise<string[]>
```

Recursively collects and returns the absolute paths of all `.md` files inside `vaultPath`. Skips hidden entries.

---

### `LinkIndex`

**File:** `src/main/link-index.ts`

A stateful in-memory index of wiki-link relationships across the vault. One shared instance exists per application session, created in `ipc-handlers.ts`.

**Internal state:**

| Property | Type | Description |
|---|---|---|
| `forwardLinks` | `Map<string, string[]>` | Maps each note path to the list of paths (or unresolved names) it links to. |
| `backLinks` | `Map<string, LinkEntry[]>` | Maps each target note path to all `LinkEntry` records pointing at it. |
| `notesByName` | `Map<string, string>` | Maps lowercase note names (without `.md`) to their absolute paths. On collision, the shortest path wins. |

---

#### `LinkIndex.buildIndex(vaultPath, notePaths)`

```typescript
buildIndex(vaultPath: string, notePaths: string[]): void
```

Clears all internal maps and rebuilds the entire index from scratch. Populates `notesByName` from `notePaths`, then calls `parseFileLinks` for every note.

---

#### `LinkIndex.parseFileLinks(filePath)`

```typescript
parseFileLinks(filePath: string): void
```

Reads `filePath` from disk, extracts all wiki-link targets using the regex `/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g`, and updates `forwardLinks` and `backLinks`. Old entries for `filePath` are cleared before repopulating. Unresolved link names are stored in `forwardLinks` as lowercase strings.

---

#### `LinkIndex.updateNoteRegistry(filePath)`

```typescript
updateNoteRegistry(filePath: string): void
```

Registers or updates the name-to-path mapping for `filePath` in `notesByName`. Call this when a note is created or renamed.

---

#### `LinkIndex.removeNote(filePath)`

```typescript
removeNote(filePath: string): void
```

Removes all references to `filePath` from all three internal maps: deletes its `notesByName` entry, removes its `forwardLinks` entry, removes its `backLinks` entry, and scrubs it as a source from all other notes' backlink entries.

---

#### `LinkIndex.getBacklinks(filePath)`

```typescript
getBacklinks(filePath: string): LinkEntry[]
```

Returns the array of `LinkEntry` objects describing all notes that link to `filePath`. Returns `[]` if none.

---

#### `LinkIndex.getForwardLinks(filePath)`

```typescript
getForwardLinks(filePath: string): string[]
```

Returns the array of link targets (resolved paths or unresolved lowercase names) for notes that `filePath` links to. Returns `[]` if none.

---

#### `LinkIndex.getAllLinks()`

```typescript
getAllLinks(): { source: string; target: string }[]
```

Returns a flat list of all resolved `{ source, target }` link pairs across the vault. Skips unresolved link entries.

---

#### `LinkIndex.resolveLink(linkName)`

```typescript
resolveLink(linkName: string): string | null
```

Looks up `linkName` (case-insensitive) in `notesByName` and returns the corresponding absolute path, or `null` if not found.

---

#### `LinkIndex.getAllNoteNames()`

```typescript
getAllNoteNames(): string[]
```

Returns all keys from `notesByName` as an array of lowercase name strings.

---

### `SearchService`

**File:** `src/main/search-service.ts`

A stateful wrapper around the [MiniSearch](https://github.com/lucasfcosta/minisearch) full-text search library. One shared instance exists per application session.

**Search configuration:**
- Indexed fields: `title`, `body`
- Stored fields: `title`, `path`
- Title boost: `2x`
- Prefix matching: enabled
- Fuzzy tolerance: `0.2` (20% edit distance)

---

#### `SearchService` constructor

```typescript
constructor()
```

Initialises a new `MiniSearch` instance with the search configuration above.

---

#### `SearchService.buildIndex(vaultPath, notePaths)`

```typescript
buildIndex(vaultPath: string, notePaths: string[]): void
```

Clears the existing index and rebuilds it from scratch. Reads each file in `notePaths`, creating a document with fields `id` (path), `title` (filename without `.md`), `path`, and `body` (file content). Files that cannot be read are indexed with an empty body.

---

#### `SearchService.updateNote(filePath)`

```typescript
updateNote(filePath: string): void
```

Discards the existing index entry for `filePath` (if any) and re-adds it with freshly read content. Call after a note is written, created, renamed, or moved.

---

#### `SearchService.removeNote(filePath)`

```typescript
removeNote(filePath: string): void
```

Discards the index entry for `filePath`. Silently does nothing if the file is not currently indexed. Call after a note is deleted or moved out of the vault.

---

#### `SearchService.search(query)`

```typescript
search(query: string): SearchResult[]
```

Searches the index for `query` with prefix matching and fuzzy tolerance enabled. Returns up to 20 `SearchResult` objects sorted by descending score. For each result, reads the file from disk and extracts up to 3 lines that contain the query string (case-insensitive literal scan). Returns `[]` immediately for blank queries.

---

### `WatcherService`

**File:** `src/main/watcher-service.ts`

Wraps [chokidar](https://github.com/paulmillr/chokidar) to watch a vault directory for filesystem changes and forward events to the renderer via IPC push messages.

---

#### `WatcherService` constructor

```typescript
constructor(vaultPath: string, mainWindow: BrowserWindow)
```

**Parameters:**

| Name | Type | Description |
|---|---|---|
| `vaultPath` | `string` | Absolute path to the vault directory to watch. |
| `mainWindow` | `BrowserWindow` | The Electron browser window to send events to. |

Starts watching `vaultPath` with the following chokidar options:

| Option | Value | Description |
|---|---|---|
| `ignored` | `/(^|[/\\])\./` | Ignores all hidden files and directories. |
| `persistent` | `true` | Keeps the process alive while watching. |
| `ignoreInitial` | `true` | Does not emit events for files that already exist when watching starts. |
| `awaitWriteFinish.stabilityThreshold` | `100` ms | Waits until the file size has not changed for 100 ms before emitting a change event. |
| `awaitWriteFinish.pollInterval` | `50` ms | Polls file size every 50 ms during the stability wait. |

All events are debounced with a 100 ms window (per unique `event:filePath` key) before being sent to the renderer via `mainWindow.webContents.send`. If the window has been destroyed, the event is silently dropped.

**Events forwarded:**

| chokidar event | IPC channel sent | Trigger |
|---|---|---|
| `change` | `vault:file-changed` | A file's content is modified. |
| `add` | `vault:file-added` | A new file appears. |
| `unlink` | `vault:file-removed` | A file is deleted. |
| `addDir` | `vault:file-added` | A new directory appears. |
| `unlinkDir` | `vault:file-removed` | A directory is deleted. |

---

#### `WatcherService.close()`

```typescript
close(): void
```

Cancels all pending debounce timers and closes the chokidar watcher. Must be called before creating a new `WatcherService` for a different vault, and is called automatically when the application window is closed or the app quits.
