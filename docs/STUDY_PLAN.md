# Nexus Notes: Zero to Hero Study Plan

This plan takes you from basic programming knowledge (C/Java background) to being able to independently develop new features in the Nexus Notes Electron app. Every module references specific files and line numbers in this repository. There are no time constraints — move to the next module only when the milestone feels solid.

---

## How to Use This Plan

- Read the theory section of each module first
- Then open the referenced files and read them with the concepts in mind
- Do every exercise before moving on
- Keep a notes file in the vault you create during setup
- When something is unclear, experiment — change the code and observe what breaks

---

## Phase 1: Foundations (Theory + Setup)

### Module 1: The Web Platform Basics

#### Theory

The web platform is built on three languages that work together in a browser:

**HTML** (HyperText Markup Language) describes structure. Think of it as declaring data types — a `<div>` is a container, an `<h1>` is a heading, a `<button>` is interactive. Unlike C structs, HTML elements are nested and form a tree.

**CSS** (Cascading Style Sheets) describes appearance. It selects elements and applies visual rules. The "cascading" means rules from multiple sources combine, with specificity determining which wins.

**JavaScript** (JS) describes behavior. It is the only programming language that runs natively in browsers. Despite the name, it has almost nothing to do with Java. It is dynamically typed, has first-class functions, and runs in a single-threaded event loop.

**The DOM** (Document Object Model) is the live, in-memory tree of all HTML elements on the page. JavaScript reads and mutates the DOM to make pages interactive. When you call `document.getElementById('root')` in `src/renderer/main.tsx` line 6, you are reaching into the DOM tree.

**How a browser renders a page:**
1. Parses HTML into the DOM tree
2. Parses CSS into the CSSOM (CSS Object Model)
3. Combines them into a Render Tree
4. Computes layout (positions and sizes of every element)
5. Paints pixels to screen

**The JavaScript engine** (V8 in Chrome/Electron) compiles JS to machine code at runtime. It runs on a single thread. All async operations (timers, network, file I/O) are handled by an event loop: the engine runs your code, queues completed async results, and processes them one at a time when the call stack is empty.

**DevTools** — in Electron, press `Ctrl+Shift+I` to open Chromium DevTools:
- Elements tab: inspect and live-edit the DOM and CSS
- Console tab: run JavaScript interactively
- Network tab: see all network requests
- Sources tab: set breakpoints in JS/TS source maps

#### Exercises

**Exercise 1.1 — CSS variable experiment.**
Open `src/renderer/styles/global.css`. On line 8, `--accent: #89b4fa` is the blue highlight color used throughout the app. Run the app with `npm run dev`. Open DevTools, go to the Elements tab, find the `:root` selector, and change `--accent` to `#f38ba8` (the danger red). Watch the entire app recolor instantly. This is the power of CSS custom properties — one variable, referenced everywhere.

**Exercise 1.2 — DOM inspection.**
With DevTools open, click the Elements tab and expand the `#root` div. You will see the React-rendered component tree as actual HTML. Find `.sidebar`, `.center-panel`, and `.right-panel`. Notice how `app-layout` uses CSS Grid (line 85 of global.css) to place them side by side.

**Exercise 1.3 — Console experiment.**
In DevTools Console, type `window.api` and press Enter. You will see the object that the preload script exposed. This is how the renderer talks to the main process. You can call `window.api.getSavedVault()` directly from the console — it returns a Promise, so follow it with `.then(console.log)`.

**Milestone:** You can explain what HTML, CSS, and JavaScript each do. You can use DevTools to inspect and modify a live Electron app.

---

### Module 2: TypeScript for Systems Programmers

#### Theory

TypeScript is JavaScript with a static type system layered on top. It compiles to plain JavaScript — the browser and Node.js never see TypeScript directly.

**Comparison table for C/Java programmers:**

| Concept | C/Java | TypeScript |
|---|---|---|
| Primitive types | `int`, `float`, `char`, `bool` | `number`, `string`, `boolean` |
| No value | `NULL`, `null` | `null`, `undefined` |
| Array | `int[]` | `number[]` or `Array<number>` |
| Struct / class fields | `struct Point { int x; int y; }` | `interface Point { x: number; y: number }` |
| Generic class | `class Box<T>` | `class Box<T>` (identical syntax) |
| Function pointer | `typedef void (*fn)(int)` | `(x: number) => void` |
| Optional field | pointer that may be NULL | `field?: Type` |
| Union type | `union` | `'file' \| 'directory'` |

**Interfaces** declare the shape of an object. They are purely a compile-time construct — no runtime cost. Look at `src/main/types.ts` lines 1–6:

```typescript
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'   // union type: only these two string values allowed
  children?: FileNode[]         // optional (?) recursive reference
}
```

The `type: 'file' | 'directory'` is a union of string literals. TypeScript will refuse to compile if you try to assign any other string. This is more expressive than a C enum because the values carry meaning as readable strings.

**async/await** compared to Java futures or C++ `std::future`:

In Java you might write:
```java
Future<String> f = executor.submit(() -> readFile(path));
String content = f.get(); // blocks the thread
```

In TypeScript you write:
```typescript
const content = await readFile(path)  // suspends this function, does NOT block the thread
```

`await` suspends only the current async function and returns control to the event loop. The thread stays free to handle other events. When the I/O completes, the event loop resumes this function from where it left off. This is cooperative multitasking, not threads.

**Modules** in TypeScript use ES Module syntax:
```typescript
import { something } from './module'   // named import
import defaultExport from './module'   // default import
export function myFunc() {}            // named export
export default myFunc                  // default export
```

This is similar to Java's `import` but at the file level, not the package level. The `from './module'` path is relative, just like `#include "file.h"` in C.

**Type inference** — TypeScript infers types you do not explicitly write:
```typescript
const x = 42          // TypeScript knows x is number, you did not have to say so
const arr = [1, 2, 3] // TypeScript knows arr is number[]
```

**`const` vs `let` vs `var`:**
- `const` — block-scoped, cannot be reassigned (like Java `final`)
- `let` — block-scoped, can be reassigned
- `var` — function-scoped, hoisted, avoid using it

#### Exercises

**Exercise 2.1 — Read `src/renderer/lib/types.ts`.**
All three interfaces — `FileNode`, `LinkEntry`, `SearchResult` — are used throughout the app. For each field, write in a comment what it represents and what values it can hold. Notice that `FileNode` is recursive: `children?: FileNode[]` means a node may contain more nodes of the same type. This models a directory tree.

**Exercise 2.2 — Read `src/main/types.ts`.**
It is identical to `src/renderer/lib/types.ts`. Ask yourself: why are the same types defined twice? The answer is that the main process and renderer process are completely separate JavaScript runtimes. They cannot share code by reference. These types are duplicated so each side has compile-time safety independently.

**Exercise 2.3 — Identify TypeScript patterns in `src/main/file-service.ts`.**
- Line 6: `export class FileService` — a class with only `static` methods (no instances ever created)
- Line 7: `async openVault(dirPath: string): Promise<FileNode>` — async method returning a typed Promise
- Line 11: `private static buildTree(...)` — private method, not accessible outside the class
- Line 19: `.sort((a, b) => { ... })` — arrow function (anonymous function, like a lambda in Java 8+)
- Line 29: `Promise<string>` — the function is async and will eventually resolve to a string

**Exercise 2.4 — Type narrowing experiment.**
In `src/main/file-service.ts` line 15, `stat.isDirectory()` is called before accessing `children`. This is runtime type narrowing — the code takes different paths based on a runtime check. TypeScript understands this and knows that inside the `if` block, this is definitely a directory. This pattern is common throughout the codebase.

**Milestone:** You can read TypeScript code and understand what every type annotation means. You can explain async/await in terms of the event loop, not threads.

---

### Module 3: Node.js and npm

#### Theory

**Node.js** takes the V8 JavaScript engine (the same one in Chrome) and adds APIs for operating system interaction: file system, network sockets, processes, and more. This is what makes JavaScript useful outside the browser.

The critical insight: Node.js uses the same event loop model as the browser. File reads, network calls, and timers are all non-blocking — they are handed off to the OS, and a callback fires when they complete. Your code never waits; it just registers what to do when results arrive.

**npm** (Node Package Manager) manages third-party libraries. The `package.json` file is the manifest:
- `dependencies` — libraries needed at runtime (shipped with the app)
- `devDependencies` — libraries needed only during development (TypeScript compiler, build tools)
- `scripts` — shortcut commands you run with `npm run <name>`

`node_modules/` is the directory where npm downloads packages. It is never committed to git — the `package.json` and `package-lock.json` files are enough to reproduce it exactly with `npm install`.

**The `fs` module** provides file system access. Nexus Notes uses it extensively:
- `fs.readFileSync(path, 'utf-8')` — synchronous read, blocks until done
- `fs.writeFileSync(path, content)` — synchronous write
- `fs.readdirSync(dir)` — list directory contents
- `fs.statSync(path)` — get file metadata (size, is-directory, etc.)
- `fs.mkdirSync(dir, { recursive: true })` — create directory tree

Note the pattern: the synchronous versions (`Sync`) block the event loop. In a web server this would be bad — it would freeze responses for all users. In a desktop app main process it is acceptable for short operations, but long operations should use the async versions.

**The `path` module** handles file paths cross-platform:
- `path.join(a, b)` — joins path segments with the OS separator (`/` on Mac/Linux, `\` on Windows)
- `path.basename('/foo/bar/baz.md')` returns `'baz.md'`
- `path.basename('/foo/bar/baz.md', '.md')` returns `'baz'`
- `path.dirname('/foo/bar/baz.md')` returns `'/foo/bar'`
- `path.extname('baz.md')` returns `'.md'`

#### Exercises

**Exercise 3.1 — Trace all `fs` calls in `src/main/file-service.ts`.**
Go through the file and list every `fs.*` call. For each one, note whether it is sync or async and what it does. You will find: `statSync`, `readdirSync`, `readFileSync`, `writeFileSync`, `existsSync`, `mkdirSync`, `unlinkSync`, `renameSync`, `copyFileSync`. Notice that `deleteNote` (line 51) uses `shell.trashItem` first and falls back to `fs.unlinkSync` — this moves to the system trash instead of permanently deleting, which is safer.

**Exercise 3.2 — Read `package.json` and understand each dependency.**
For each entry in `dependencies`, look it up and write one sentence about what it does:
- `@codemirror/*` — the editor library, split into many small packages
- `chokidar` — file system watcher
- `d3-force`, `d3-selection`, `d3-zoom` — graph visualization
- `markdown-it` — markdown to HTML parser (note: imported in package.json but not found directly used in the source — it may have been added for a future feature)
- `minisearch` — full-text search
- `zustand` — state management

**Exercise 3.3 — Understand the build scripts.**
In `package.json` lines 6–16:
- `npm run dev` runs `electron-vite dev` — starts in development mode with hot reload
- `npm run build` runs `electron-vite build` — compiles everything to `out/`
- `npm run build:win` builds a distributable Windows installer

Run `npm run dev` from the project root. Watch the terminal output. Two processes start: the main process (Node.js) and the renderer dev server (Vite).

**Milestone:** You can explain what Node.js adds to JavaScript. You can read a `package.json` and understand the purpose of each section.

---

## Phase 2: The Electron Framework

### Module 4: Electron Architecture

#### Theory

Electron bundles two things into one executable:
1. **Chromium** — a full web browser engine for rendering HTML/CSS/JS
2. **Node.js** — for OS-level access (files, processes, native dialogs)

This gives you a desktop app with a web UI and full system access. The tradeoff is size (50–150 MB per app) and memory usage.

**Two process types:**

The **Main Process** is a Node.js process. It:
- Starts when the app launches
- Creates and manages `BrowserWindow` instances
- Has full access to the OS (files, dialogs, system APIs)
- Can use all Node.js modules
- There is exactly one main process

The **Renderer Process** is a Chromium tab. It:
- Runs inside each `BrowserWindow`
- Renders HTML/CSS/JS (your React UI)
- By default has NO Node.js access (for security)
- There can be many renderer processes (one per window)

This separation exists because web content is untrusted — if you are rendering user content or loading external URLs, a compromised renderer cannot directly access the file system. The main process acts as a gatekeeper.

**BrowserWindow lifecycle in `src/main/index.ts`:**
1. `app.whenReady()` (line 70) — fires when Electron finishes initializing
2. `createWindow()` is called (line 114) — creates the `BrowserWindow`
3. In development (line 63), the window loads the Vite dev server URL
4. In production (line 66), it loads the built `index.html` file
5. `mainWindow.on('ready-to-show', ...)` (line 48) — fires when the renderer has painted its first frame; the window is hidden until this point to avoid a white flash

**Config persistence** (lines 14–31 of `src/main/index.ts`):
The app saves the vault path and window size to `~/.nexusnotes/config.json`. `app.getPath('home')` returns the user's home directory cross-platform. This is a simple but effective pattern — no database needed for small amounts of config.

#### Exercises

**Exercise 4.1 — Trace the app lifecycle in `src/main/index.ts`.**
Read the file from top to bottom. Draw a timeline on paper:
1. Module loads → CONFIG_DIR and CONFIG_FILE constants defined (lines 8–9)
2. `app.whenReady()` fires
3. `registerIpcHandlers()` called (line 77) — registers all IPC channels
4. `vault:select`, `vault:getSaved`, `vault:startWatching`, `vault:stopWatching` handlers registered inline (lines 80–112)
5. `createWindow()` called (line 114)
6. Inside `createWindow()`: window created, event handlers attached, URL loaded

**Exercise 4.2 — Identify what runs where.**
Go through every import at the top of `src/main/index.ts` line 1. Notice `BrowserWindow`, `dialog`, `ipcMain`, `shell` — all are Electron main-process APIs. Now open `src/renderer/App.tsx` line 1 — `React`, `useEffect`, `useState` — all are renderer-process APIs. The separation is enforced at the import level.

**Exercise 4.3 — Window options experiment.**
In `src/main/index.ts` line 37, `autoHideMenuBar: true` hides the top menu bar. Change it to `false`, restart the app, and observe the menu bar appear. Change `show: false` on line 39 to `show: true` and restart — you will see a brief white flash before the UI renders. This is why it defaults to `false` with the `ready-to-show` pattern.

**Milestone:** You can explain the main/renderer split in your own words. You can trace the startup sequence of the app.

---

### Module 5: IPC Communication

#### Theory

IPC stands for Inter-Process Communication. The main and renderer processes have separate memory spaces — they cannot call each other's functions directly, just as two separate programs on your computer cannot share variables.

Electron provides two IPC mechanisms:

**Request/Response** (`ipcMain.handle` / `ipcRenderer.invoke`):
- Renderer calls `ipcRenderer.invoke('channel-name', ...args)`
- Main process has a handler registered with `ipcMain.handle('channel-name', async (event, ...args) => { ... })`
- The invoke call returns a Promise that resolves with the handler's return value
- This is like an RPC (Remote Procedure Call) — the renderer requests something and waits for a response

**One-way push** (`webContents.send` / `ipcRenderer.on`):
- Main process calls `mainWindow.webContents.send('channel-name', data)` to push events to the renderer
- Renderer listens with `ipcRenderer.on('channel-name', (event, data) => { ... })`
- Used for file watcher events — the main process detects a file change and notifies the renderer

**The contextBridge** solves a security problem. If you gave the renderer direct access to `ipcRenderer`, malicious content loaded in the renderer could send arbitrary IPC messages. Instead, the preload script (which runs in a privileged context) uses `contextBridge.exposeInMainWorld('api', { ... })` to expose a carefully controlled set of functions. The renderer only gets what the preload explicitly allows.

**The full IPC chain for reading a file:**
```
Renderer calls window.api.readNote(path)
  -> preload/index.ts: ipcRenderer.invoke('fs:readNote', path)
  -> [IPC channel across process boundary]
  -> main/ipc-handlers.ts: ipcMain.handle('fs:readNote', async (_e, filePath) => FileService.readNote(filePath))
  -> main/file-service.ts: fs.readFileSync(filePath, 'utf-8')
  -> returns string back up the chain
  -> Promise resolves in renderer with file content
```

#### Exercises

**Exercise 5.1 — Read `src/preload/index.ts` and map every API method.**
The file exposes 20+ methods. For each one, write down:
- The method name on `window.api`
- The IPC channel string it invokes (e.g., `'fs:readNote'`)
- What arguments it takes and what it returns

Pay attention to lines 37–51: the watcher event subscriptions. Unlike the `invoke` methods, these use `ipcRenderer.on` (one-way push). They return an unsubscribe function — calling it removes the listener, preventing memory leaks.

**Exercise 5.2 — Read `src/main/ipc-handlers.ts` and match channels to handlers.**
Every `ipcMain.handle('channel-name', ...)` call in this file corresponds to one `ipcRenderer.invoke('channel-name', ...)` in the preload. Verify that every channel in the preload has a matching handler here. Notice what each handler does beyond just calling the service — for example, `fs:writeNote` (line 23) calls `FileService.writeNote` AND then updates the link index and search index. A write operation has side effects that keep all indexes consistent.

**Exercise 5.3 — Draw the full IPC map on paper.**
Create a two-column diagram:
- Left column: every `window.api.*` method from preload
- Right column: the service method it ultimately calls in the main process
- Draw arrows connecting them through the channel names

Also draw the reverse direction: `WatcherService` sending events via `webContents.send` → preload `onFileChanged/onFileAdded/onFileRemoved` → `useVault.ts` callbacks.

**Exercise 5.4 — Trace `vault:startWatching`.**
This channel is registered in `src/main/index.ts` line 98 (not in `ipc-handlers.ts`). Find where it is called in the renderer. Trace: `useVault.ts` line 11 calls `window.api.startWatching(vaultPath)` → preload line 7 → `ipcMain.handle('vault:startWatching', ...)` in `index.ts` line 98 → creates a new `WatcherService`. Why is this handler in `index.ts` instead of `ipc-handlers.ts`? Because it needs access to the `mainWindow` reference, which is module-level state in `index.ts`.

**Milestone:** You can trace any user action from the renderer button click all the way down to the file system and back. You understand why the contextBridge exists.

---

### Module 6: electron-vite Build System

#### Theory

**Vite** is a build tool for web projects. Its two jobs are:
1. **Dev server** — serves your source files with instant hot module replacement (HMR). When you save a file, the browser updates only the changed module without a full reload.
2. **Production bundler** — uses Rollup under the hood to bundle all your source files into optimized output files.

Vite is fast because it uses native ES modules in the browser during development — no bundling step needed. Only in production does it bundle everything together.

**electron-vite** wraps Vite to handle all three Electron entry points in one config:
- `main` — the Node.js main process code
- `preload` — the preload script (needs special treatment)
- `renderer` — the web UI (React app)

**`electron.vite.config.ts` line by line:**

```typescript
// Line 6: externalizeDepsPlugin() for main process
// This tells Vite: do NOT bundle node_modules into the main process output.
// Instead, require() them at runtime from node_modules.
// This is correct for Node.js — bundling native modules causes problems.

// Line 9: Same for preload
// Preload also runs in Node.js context, so same rule applies.

// Lines 13-15: Path alias for renderer
// '@renderer' maps to 'src/renderer'
// This lets you write: import { thing } from '@renderer/lib/types'
// Instead of: import { thing } from '../../lib/types'

// Line 18: react() plugin
// Transforms JSX syntax (the HTML-like <div> tags in .tsx files)
// into React.createElement() calls that JavaScript understands.
```

**TypeScript compilation** — `tsc` (TypeScript compiler) checks types and emits JavaScript. But electron-vite actually uses `esbuild` for the transformation step (much faster than `tsc`) and runs `tsc` separately just for type checking. This is why `npm run dev` starts quickly.

**Output structure after `npm run build`:**
```
out/
  main/       <- compiled main process code
    index.js
  preload/    <- compiled preload script
    index.js
  renderer/   <- bundled renderer web app
    index.html
    assets/
      index-[hash].js
      index-[hash].css
```

#### Exercises

**Exercise 6.1 — Read `electron.vite.config.ts` and understand each section.**
It is only 20 lines but every line matters. The `externalizeDepsPlugin` is the most important concept — without it, packages like `chokidar` (which uses native Node.js bindings) would fail to bundle.

**Exercise 6.2 — Run `npm run build` and examine the `out/` directory.**
After building, look at `out/main/index.js`. It is the compiled version of `src/main/index.ts`. You will see it is readable JavaScript. Now look at `out/renderer/assets/index-*.js` — this is the bundled and minified version of all your React code. It will be much less readable because Vite minifies it for production.

**Exercise 6.3 — HMR experiment.**
Run `npm run dev`. Open `src/renderer/styles/global.css` and change `--accent: #89b4fa` to `--accent: #cba6f7` (purple). Save the file. Watch the app update instantly without a reload. This is Vite's HMR in action. Now change a component file like `src/renderer/components/EditorToolbar.tsx` — add a button. Save. The component updates in place.

**Milestone:** You can explain what a bundler does and why Electron needs separate configs for main, preload, and renderer. You understand the difference between dev mode and production builds.

---

## Phase 3: React UI Framework

### Module 7: React Fundamentals

#### Theory

React is a library for building user interfaces from **components** — reusable, self-contained pieces of UI.

**The core idea:** Instead of manually manipulating the DOM (like jQuery did), you describe what the UI *should look like* given the current data, and React figures out the minimal DOM changes needed to get there. This is called **declarative rendering**.

**JSX** is a syntax extension that lets you write HTML-like markup inside JavaScript:

```tsx
// This JSX:
const element = <div className="sidebar">Hello</div>

// Compiles to this JavaScript:
const element = React.createElement('div', { className: 'sidebar' }, 'Hello')
```

Note: HTML uses `class`, but JSX uses `className` because `class` is a reserved word in JavaScript.

**Components** are functions that return JSX:

```tsx
// A functional component
function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>
}

// Used like an HTML element:
<Button label="Click me" onClick={() => console.log('clicked')} />
```

**Props** are arguments passed to a component. They flow downward (parent to child). In TypeScript, you define an interface for them:

```tsx
interface ButtonProps {
  label: string
  onClick: () => void
}
const Button: React.FC<ButtonProps> = ({ label, onClick }) => { ... }
```

**State** is data that belongs to a component and causes re-renders when it changes. Unlike props (read-only, from parent), state is owned by the component itself.

**Re-rendering:** When state changes, React calls your component function again with the new state and computes a new virtual DOM. It then diffs the old virtual DOM against the new one and applies only the minimal real DOM changes. This diff algorithm is why React is fast.

**The React entry point** is `src/renderer/main.tsx`:
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```
This mounts the `App` component into the `<div id="root">` in `index.html`. `React.StrictMode` runs components twice in development to help find bugs (this is why you might see effects run twice in dev mode).

#### Exercises

**Exercise 7.1 — Read `src/renderer/App.tsx` and identify all components.**
Lines 2–8 import all the child components. The `App` component renders:
- `<FileExplorer>` — left sidebar
- `<EditorToolbar>` — above the editor
- `<MarkdownEditor>` — the main editor
- `<BacklinksPanel>` or `<GraphView>` — right panel (toggled)
- `<SearchPanel>` — modal overlay (conditionally rendered)

For each component, note what props it receives. Props are the "interface" between components.

**Exercise 7.2 — Trace a button click through the code.**
Pick the "New Note" button in the sidebar header (`FileExplorer.tsx` line 165). Trace:
1. User clicks button → `onClick={handleNewNoteTop}` fires
2. `handleNewNoteTop` (line 119) calls `window.api.createNote(vaultPath, name)`
3. Returns a `filePath`
4. Calls `onRefresh()` — which is `refreshVault` from `useVault.ts` — rebuilds the file tree
5. Calls `onFileClick(filePath)` — which is `openNote` from `useVault.ts` — opens the new note

**Exercise 7.3 — Conditional rendering experiment.**
In `src/renderer/App.tsx` lines 117–131, the app renders differently based on state:
- If `loading` is true: shows "Loading..."
- If `vaultPath` is null: shows the vault selection screen
- Otherwise: shows the full app layout

Add a third condition: if a hypothetical `error` state is set, show an error message. This is the standard React pattern for different UI states.

**Milestone:** You can read any React component and understand what it renders, what data it receives via props, and what user interactions it handles.

---

### Module 8: React Hooks Deep Dive

#### Theory

Hooks are functions that let components use React features (state, side effects, refs) without writing classes. All hooks start with `use`.

**`useState`** — Declares a piece of state:
```typescript
const [value, setValue] = useState(initialValue)
```
When `setValue` is called with a new value, React re-renders the component. The array destructuring gives you the current value and a setter function. Compare to a Java field: the difference is that every call to `setValue` schedules a re-render.

**`useEffect`** — Runs side effects after rendering:
```typescript
useEffect(() => {
  // Runs after render
  const sub = subscribeToSomething()

  return () => {
    // Cleanup: runs before the next effect or on unmount
    sub.unsubscribe()
  }
}, [dependency1, dependency2]) // Only re-runs when these values change
```

The dependency array controls when the effect re-runs:
- `[]` — runs only once, on mount (like a constructor)
- `[x, y]` — runs when `x` or `y` changes
- No array — runs after every render (rare, usually a bug)

**`useRef`** — Holds a mutable value that does NOT cause re-renders:
```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null)
timerRef.current = setTimeout(...)  // mutate without re-render
```
Also used to hold a reference to a DOM element:
```typescript
const divRef = useRef<HTMLDivElement>(null)
// After render: divRef.current is the actual DOM element
```

**`useCallback`** — Memoizes a function so it doesn't get recreated on every render:
```typescript
const handleClick = useCallback(() => {
  doSomething(value)
}, [value]) // Only recreate if value changes
```
This matters when passing callbacks as props — without `useCallback`, a new function is created every render, causing child components to re-render unnecessarily.

**`useMemo`** — Memoizes a computed value:
```typescript
const sorted = useMemo(() => items.sort(...), [items])
```

**Custom hooks** are just functions that call other hooks. They let you extract and reuse stateful logic. The `use` prefix is a convention that tells React's linter to enforce hook rules.

#### Exercises

**Exercise 8.1 — Read `src/renderer/hooks/useVault.ts` line by line.**

- Line 7: `useCallback` with `[]` dependency — `loadVault` never gets recreated. Why is this safe? Because it reads `store` methods that are themselves stable references (Zustand guarantees this).
- Line 17: `openNote` — reads note content, sets active file, fetches backlinks. All in one operation.
- Line 51: `useEffect` — this is the file watcher setup. The effect registers three event listeners on mount and the cleanup function (returned at line 73) removes them on unmount. The dependency array `[store.activeFile, refreshVault]` means this effect re-runs when `activeFile` changes — this is important because the `onFileChanged` callback captures `store.activeFile` in its closure.

**Exercise 8.2 — Trace the `useEffect` lifecycle in `useVault.ts`.**
On paper, draw what happens:
1. Component mounts → `useEffect` runs → three listeners registered
2. User opens a note → `store.activeFile` changes → React re-renders → `useEffect` cleanup runs (removes old listeners) → `useEffect` runs again (registers new listeners with updated `store.activeFile` in closure)
3. Component unmounts → cleanup runs → listeners removed

This pattern is critical. Without the cleanup, you would accumulate duplicate listeners every time `activeFile` changes.

**Exercise 8.3 — Read `src/renderer/App.tsx` line 21.**
`const saveTimerRef = useRef<NodeJS.Timeout | null>(null)` holds the debounce timer for auto-saving. In `handleContentChange` (line 42), every keystroke clears the old timer and sets a new one. After 300ms of no typing, `saveNote` fires. This is debouncing — a very common UI pattern. Why `useRef` and not `useState`? Because changing the timer reference should NOT cause a re-render.

**Milestone:** You can explain what each hook does and why it exists. You can read a custom hook and understand the data flow through it.

---

### Module 9: State Management with Zustand

#### Theory

As apps grow, components need to share state. Passing props down many levels ("prop drilling") becomes unmanageable. Global state management solves this.

**Zustand** is a minimal state management library. Its entire API is one function: `create`.

```typescript
const useStore = create<State>((set) => ({
  // Initial state
  count: 0,

  // Actions (functions that update state)
  increment: () => set((s) => ({ count: s.count + 1 }))
}))

// In a component:
const count = useStore((s) => s.count)
const increment = useStore((s) => s.increment)
```

**Selectors** — the function passed to `useStore` is a selector. It picks which part of the state you care about. React only re-renders your component when the selected value changes. This is an optimization — if you only select `count`, your component doesn't re-render when something unrelated changes.

**Comparing to other approaches:**
- Redux: requires actions, reducers, and dispatch — much more boilerplate
- Context API (built into React): simpler but causes all consumers to re-render on any change
- Zustand: minimal boilerplate, fine-grained subscriptions

**The `set` function** can take either a partial state object or a function:
```typescript
set({ count: 5 })                        // merge with current state
set((state) => ({ count: state.count + 1 })) // derive from current state
```

**Accessing state outside React** — Zustand stores can be accessed outside components:
```typescript
useVaultStore.getState().setActiveContent(content)
```
This is used in `App.tsx` line 43 — inside `handleContentChange`, which is wrapped in `useCallback`. Inside a `useCallback` or `useEffect`, accessing store state via `getState()` avoids stale closure problems.

#### Exercises

**Exercise 9.1 — Read `src/renderer/store/vault-store.ts` completely.**
Identify all state fields (lines 5–17) and all actions (lines 18–29). Notice the pattern: for every piece of state, there is a corresponding setter. The toggle actions (lines 26–29) use the function form of `set` to flip boolean values without reading from React state.

**Exercise 9.2 — Map which components read which state fields.**
Go through each component and find their `useVaultStore` calls:
- `App.tsx` line 13: destructures many fields at once (note: this causes re-render on any field change)
- `MarkdownEditor.tsx` lines 82–83: selects only `vaultPath` and `noteNames` (fine-grained)
- `FileExplorer.tsx` line 26: selects only `vaultPath`
- `useLinks.ts` line 5: selects only `setBacklinks`
- `useSearch.ts` lines 6–7: selects `setSearchResults` and `setSearchQuery`

The fine-grained selectors in hooks and components that need only one field are more efficient than the destructuring in `App.tsx`.

**Exercise 9.3 — Add a new state field.**
Add a `isDirty: boolean` field to `vault-store.ts` that tracks whether the current note has unsaved changes. Add a `setIsDirty` action. Then in `App.tsx`, set it to `true` in `handleContentChange` and `false` after `saveNote` completes. Display a dot (•) in the window title or near the file name when `isDirty` is true. This is a complete end-to-end state feature.

**Milestone:** You understand why global state management exists and can add new state to the Zustand store. You understand selectors and re-rendering.

---

## Phase 4: Core Features Deep Dive

### Module 10: File System Layer

#### Theory

The file system layer has two parts: the `FileService` class (pure operations) and the IPC handlers that orchestrate them. Understanding the design decisions here is as important as understanding the code.

**Why static methods?** `FileService` has no instance state — every method takes all its inputs as parameters. Static methods make this explicit. There is no need to construct a `FileService` object because it holds nothing. This is a valid design when you have a collection of related utility functions.

**The `buildTree` recursion** (`src/main/file-service.ts` lines 11–27):
```
buildTree(currentPath, rootPath)
  stat the path
  if directory:
    read directory entries
    filter out hidden files (starting with '.')
    for each child: buildTree(child, rootPath)  <- recursion
    sort: directories first, then files, both alphabetically
    return { name, path, type: 'directory', children }
  else:
    return { name, path, type: 'file' }
```

This produces a `FileNode` tree that mirrors the actual directory structure. The renderer renders this tree directly as the file explorer.

**The `listAllNotes` walk** (lines 95–112) is a non-recursive implementation of the same traversal. It uses an explicit stack (the `walk` inner function called recursively) to collect all `.md` file paths. These paths feed into `LinkIndex` and `SearchService` for indexing.

**Path handling** — `path.join` is used consistently instead of string concatenation. This is cross-platform safe: on Windows it produces `C:\Users\...`, on Mac/Linux it produces `/Users/...`. Never concatenate paths with `+` or template literals.

#### Exercises

**Exercise 10.1 — Read `src/main/file-service.ts` line by line.**
For every method, write its signature in plain English: "Takes X, does Y, returns Z, throws if W."

**Exercise 10.2 — Trace `openVault` → `buildTree` recursion.**
Given a directory structure:
```
MyVault/
  Notes/
    meeting.md
  ideas.md
```
Manually trace `buildTree('MyVault', 'MyVault')`:
- Call 1: path=MyVault, isDirectory=true, children=[Notes, ideas.md]
  - Call 2: path=MyVault/Notes, isDirectory=true, children=[meeting.md]
    - Call 3: path=MyVault/Notes/meeting.md, isFile → return {name:'meeting.md', path:..., type:'file'}
  - return {name:'Notes', ..., type:'directory', children:[{meeting.md node}]}
  - Call 4: path=MyVault/ideas.md, isFile → return {name:'ideas.md', ...}
- Sort: directories first → Notes before ideas.md
- return {name:'MyVault', ..., type:'directory', children:[{Notes}, {ideas.md}]}

**Exercise 10.3 — Add a new file operation.**
Add a `duplicateNote` static method that copies a file to the same directory with "Copy of " prepended to the name. Then add an IPC handler `fs:duplicateNote` in `ipc-handlers.ts`, add the method to the preload API in `preload/index.ts`, and add a "Duplicate" option to the context menu in `FileExplorer.tsx`.

**Milestone:** You can trace any file operation from the context menu click to the file system and back. You can add new file operations end-to-end.

---

### Module 11: File Watching with Chokidar

#### Theory

**The problem:** When an external editor modifies a file in the vault, Nexus Notes needs to know. The OS provides file system events for this, but raw OS events are unreliable — a single file save often fires multiple events in rapid succession.

**Chokidar** wraps the OS file watching APIs (FSEvents on macOS, inotify on Linux, ReadDirectoryChangesW on Windows) with a consistent interface and additional reliability features.

**Key options in `src/main/watcher-service.ts` lines 10–18:**
- `ignored: /(^|[/\\])\./` — regex that ignores hidden files/directories (starting with `.`). The regex matches a dot preceded by the start of string or a path separator.
- `persistent: true` — keeps the process alive while watching
- `ignoreInitial: true` — don't fire events for files that already exist when watching starts
- `awaitWriteFinish` — waits for file writes to complete before firing the event. Without this, you get multiple events while a file is being written. `stabilityThreshold: 100` means the file size must be stable for 100ms.

**Debouncing** (lines 20–29):
Even with `awaitWriteFinish`, events can fire rapidly. The `debounce` function ensures that multiple events for the same file within 100ms collapse into a single event. The pattern:
1. Check if a timer already exists for this event+file key
2. If yes, cancel it (the earlier event is absorbed)
3. Set a new timer for 100ms
4. When the timer fires, send the event to the renderer

This is a fundamental UI pattern. Without debouncing, typing in an editor would trigger a save, a file-changed event, a re-read, and a UI update on every single keystroke.

**Event forwarding** (lines 32–37):
Chokidar events are forwarded to the renderer via `mainWindow.webContents.send(...)`. The channel names follow the pattern `vault:file-changed`, `vault:file-added`, `vault:file-removed`. The `mainWindow.isDestroyed()` check prevents crashes when a file event fires after the window has been closed.

#### Exercises

**Exercise 11.1 — Read `src/main/watcher-service.ts` completely.**
The `debounceTimers` Map (line 7) uses the string `"event:filePath"` as the key. Why combine event type and path? So that a `change` event and an `add` event for the same file don't cancel each other — they are independent events that should both fire.

**Exercise 11.2 — Trace a file change event end-to-end.**
When you modify a file in an external editor:
1. OS notifies chokidar → `'change'` event fires with `filePath`
2. `debounce('file-changed', filePath)` is called
3. After 100ms (no more events): `mainWindow.webContents.send('vault:file-changed', filePath)`
4. Preload `onFileChanged` handler fires (preload/index.ts line 37)
5. Renderer callback registered in `useVault.ts` line 52 fires
6. If `filePath === store.activeFile`: re-read the file and update `activeContent`
7. Always: call `window.api.rebuildFileIndex(filePath)` to update link and search indexes

**Exercise 11.3 — Modify debounce timing.**
Change the debounce delay from `100` (line 29) to `1000` (1 second). Save an external file and notice the 1-second lag before Nexus Notes reacts. Change it to `10`. Notice it might fire multiple times for a single save. 100ms is a carefully chosen sweet spot.

**Milestone:** You understand file system events, debouncing, and how external changes propagate into the UI.

---

### Module 12: CodeMirror 6 Editor

#### Theory

CodeMirror 6 (CM6) is a complete rewrite of the classic CodeMirror editor. Its architecture is fundamentally different from most editors.

**Core concepts:**

**`EditorState`** — an immutable snapshot of the editor's content and selection. You never mutate it. Instead, you create transactions that describe changes, and applying a transaction produces a new `EditorState`. This is the same immutability pattern as Redux or functional data structures.

**`EditorView`** — the visible editor. It holds a reference to the current `EditorState` and handles rendering, event handling, and DOM management. It is mutable (it updates over time) but always reflects an immutable state.

**Extensions** — CM6's plugin system. Everything is an extension: keymaps, syntax highlighting, line numbers, themes, custom decorations. Extensions compose — you pass an array of them when creating `EditorState`.

**`ViewPlugin`** — a plugin that runs alongside the view and can update in response to view changes. Used in `cm-wiki-link.ts` to detect and decorate wiki links.

**Decorations** — visual overlays applied to ranges of text without modifying the underlying content. A `Decoration.mark({ class: 'cm-wiki-link' })` (cm-wiki-link.ts line 4) adds a CSS class to matched text ranges, which global.css then styles with the blue underline.

**`RangeSetBuilder`** — efficiently builds a sorted set of decorations. You must add ranges in order from start to finish. See `buildDecorations` in cm-wiki-link.ts lines 8–21.

**Transactions** — the way to change editor content programmatically:
```typescript
view.dispatch({
  changes: { from: 10, to: 15, insert: 'new text' },
  selection: { anchor: 10 + 'new text'.length }
})
```
This is how all the smart-edit operations work.

**The editor is created once** in `MarkdownEditor.tsx` (the `useEffect` with `[]` dependency on line 89). It is NOT recreated when props change. Instead, a second `useEffect` (line 166) dispatches a transaction to update the content when the file changes.

#### Exercises

**Exercise 12.1 — Read `src/renderer/components/Editor/MarkdownEditor.tsx` completely.**
Focus on:
- Lines 99–125: the full list of extensions passed to `EditorState.create`. Each extension adds a capability. Try commenting one out (e.g., `lineNumbers()` on line 102) and see what disappears.
- Lines 133–153: the click handler for wiki links. It uses `view.posAtDOM(target)` to convert a DOM element to a character position, then `view.state.doc.lineAt(pos)` to get the full line, then runs the regex on the line text.
- Line 163: `}, [])` — empty dependency array means this effect runs ONCE on mount. The editor is created once and lives for the component's lifetime.

**Exercise 12.2 — Read `src/renderer/components/Editor/cm-wiki-link.ts`.**
The `ViewPlugin.fromClass` pattern (line 23): you provide a class with a constructor and an `update` method. The constructor receives the initial view and computes initial decorations. The `update` method receives a `ViewUpdate` — it checks `update.docChanged || update.viewportChanged` (line 30) and recomputes decorations if needed. Viewport-change checking is important — CM6 only renders visible lines (virtual scrolling), so decorations must be recomputed as you scroll.

**Exercise 12.3 — Read `src/renderer/components/Editor/cm-smart-edit.ts`.**
Each exported function (`handleEnterInList`, `handleTabInList`, `toggleCheckbox`, `toggleBold`, etc.) takes an `EditorView` and returns `boolean`. The boolean indicates whether the function "handled" the event — if `true`, CM6 stops looking for other handlers.

The `smartEditKeymap` array (lines 262–295) maps key strings to these handlers. `'Mod-b'` means Ctrl+B on Windows/Linux and Cmd+B on Mac — CM6 handles this cross-platform abstraction.

**Exercise 12.4 — Add a new keybinding.**
Add `Ctrl+Shift+H` to insert a horizontal rule (`---`). Steps:
1. Write a function `insertHRule(view: EditorView): boolean` in cm-smart-edit.ts
2. Add `{ key: 'Mod-Shift-H', run: insertHRule }` to `smartEditKeymap`
3. Test in the running app

**Milestone:** You understand CM6's extension system and can add new editor behaviors.

---

### Module 13: Wiki-Link System

#### Theory

The wiki-link system has three parts that work together:

1. **Decoration** (cm-wiki-link.ts) — visually highlights `[[link]]` patterns
2. **Autocomplete** (cm-autocomplete.ts) — suggests note names when typing `[[`
3. **Click handling** (MarkdownEditor.tsx lines 133–153) — navigates to the linked note

**Regex pattern** used in both the editor and the link index:
```
/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
```
Breaking this down:
- `\[\[` — literal `[[`
- `([^\]|]+)` — capture group 1: one or more characters that are not `]` or `|` (the link target)
- `(?:\|([^\]]+))?` — optional non-capturing group: `|` followed by capture group 2 (the display text)
- `\]\]` — literal `]]`
- `g` flag — global, find all matches in the string

So `[[My Note]]` captures `My Note` in group 1. `[[My Note|display text]]` captures `My Note` in group 1 and `display text` in group 2.

**The `WIKI_LINK_RE.lastIndex = 0` pattern** (cm-wiki-link.ts line 13):
A regex with the `g` flag maintains state — `lastIndex` tracks where to start the next search. When you reuse the same regex object across multiple calls (as with a module-level constant), you must reset `lastIndex` to 0 before each new search, or matches from a previous call will be skipped.

**The autocomplete flow** (cm-autocomplete.ts):
1. User types `[[` → CM6 calls the `CompletionSource` function
2. Function reads the current line text before the cursor
3. `lastIndexOf('[[')` finds the most recent opening
4. Checks there is no `]]` after it (not already closed)
5. Takes text after `[[` as the query
6. Filters `noteNames` array by whether they include the query
7. Maps to `CompletionResult` objects with `apply: name + ']]'` — selecting a completion closes the link

#### Exercises

**Exercise 13.1 — Trace decoration building in `cm-wiki-link.ts`.**
In `buildDecorations` (line 8), `view.visibleRanges` gives the character ranges currently visible in the viewport. For each range, `view.state.doc.sliceString(from, to)` extracts the text. The regex runs on this text, and for each match, `builder.add(start, end, wikiLinkMark)` adds a decoration. The `start` and `end` are absolute positions in the document (not relative to the visible range), computed as `from + match.index`.

**Exercise 13.2 — Read `cm-autocomplete.ts` and understand `CompletionSource`.**
A `CompletionSource` is a function that takes a `CompletionContext` and returns either `null` (no completions) or a `CompletionResult`. The `from` field in `CompletionResult` (line 33) is the start position that the accepted completion will replace — here it's the position right after `[[`. When the user selects a completion, the text from `from` to the cursor is replaced with `option.apply`.

**Exercise 13.3 — Add support for aliased link display.**
Currently, `[[Note|Display Text]]` is decorated as a whole. Modify `cm-wiki-link.ts` to use two different decoration classes: one for the target text and one for the display text. This would allow styling them differently in CSS.

**Milestone:** You understand regex-based text analysis, CM6 decorations, and the autocomplete API.

---

### Module 14: Smart Editing

#### Theory

Smart editing means the editor understands the semantic structure of what you're writing and assists accordingly. `cm-smart-edit.ts` implements several behaviors:

**List continuation** — when you press Enter on a list line, the next line starts with the same list marker. This mirrors the behavior of Word processors and makes writing lists natural.

**Smart toggle** — `toggleWrap` (line 134) is a general-purpose toggle for inline markers like `**`, `*`, and `` ` ``. With text selected: if the selection is already wrapped, it unwraps; otherwise it wraps. Without selection: inserts two markers and places the cursor between them.

**Smart paste** — `smartPasteExtension` (line 200) intercepts paste events. If text is selected AND the pasted content looks like a URL (regex `^https?:\/\/\S+$`), it wraps the selected text as a markdown link: `[selected text](pasted-url)`. This is a micro-UX win that saves several keystrokes.

**Checkbox click** — `checkboxClickExtension` (line 222) listens for `mousedown` events and checks if the click position is on a `[ ]` or `[x]` pattern. If so, it toggles the checkbox and prevents the default behavior. This turns raw markdown checkboxes into clickable UI elements.

**The `EditorView.domEventHandlers` API** lets you intercept DOM events and decide whether CM6 should handle them further (return `false`) or stop propagation (return `true`).

#### Exercises

**Exercise 14.1 — Read `cm-smart-edit.ts` and understand each behavior.**
Focus on `handleEnterInList` (line 5). The three patterns it checks — bullet list (`-` or `*`), numbered list (`1.`), and checkbox (`- [ ]`) — each have slightly different continuation logic. The numbered list increments the number. The checkbox continues with `- [ ]` (unchecked).

**Exercise 14.2 — Trace a `Mod-b` keypress.**
1. User presses Ctrl+B
2. CM6 checks its keymap, finds `{ key: 'Mod-b', run: toggleBold }`
3. Calls `toggleBold(view)` → calls `toggleWrap(view, '**')`
4. `toggleWrap` reads current selection
5. If selection is empty: inserts `****` and places cursor between the pairs
6. If selection exists and is wrapped: unwraps
7. If selection exists but not wrapped: wraps and extends selection

**Exercise 14.3 — Add a new smart editing feature.**
Add a "strikethrough" toggle with `Ctrl+Shift+S` using `~~text~~` syntax (standard Markdown strikethrough). Follow the exact pattern of `toggleBold` and `toggleItalic`.

**Milestone:** You can add new editor behaviors by following the established patterns in cm-smart-edit.ts.

---

### Module 15: Link Index and Backlinks

#### Theory

The link index maintains two bidirectional maps between notes:

**Forward links** (`forwardLinks: Map<string, string[]>`):
- Key: absolute path of a source note
- Value: array of absolute paths this note links to
- "Note A contains links to [Note B, Note C]"

**Backward links** (`backLinks: Map<string, LinkEntry[]>`):
- Key: absolute path of a target note
- Value: array of `LinkEntry` objects describing who links here
- "Note B is linked from [Note A line 5, Note D line 12]"

**Name registry** (`notesByName: Map<string, string>`):
- Key: lowercase filename without `.md` extension
- Value: absolute path
- Allows resolving `[[My Note]]` → `/path/to/My Note.md`

**Why lowercase keys?** Wiki links are case-insensitive by convention. `[[my note]]` and `[[My Note]]` should resolve to the same file.

**Shortest path wins on collision** (lines 21–24): if two notes have the same name in different directories, the one with the shorter path wins. This is a reasonable heuristic, though Obsidian uses a different algorithm.

**Incremental updates** — when a file changes, `parseFileLinks` (line 33) is called. It:
1. Reads the file
2. Clears the file's old entries from `backLinks` (lines 42–45)
3. Scans for new links
4. Updates `forwardLinks` and `backLinks`

This is much faster than rebuilding the entire index on every file change.

#### Exercises

**Exercise 15.1 — Read `src/main/link-index.ts` line by line.**
Pay attention to the clearing logic in `parseFileLinks` lines 42–45. Before re-parsing, old backlinks from this source must be removed from every target's backlink list. Without this, editing a note that removes a link would leave stale backlinks.

**Exercise 15.2 — Draw the data structure on paper.**
Create three notes mentally: A links to B, B links to C, A links to C. Draw:
- `notesByName`: {a → /A.md, b → /B.md, c → /C.md}
- `forwardLinks`: {/A.md → [/B.md, /C.md], /B.md → [/C.md], /C.md → []}
- `backLinks`: {/B.md → [{source:/A.md, line:1, ...}], /C.md → [{source:/A.md,...}, {source:/B.md,...}]}

**Exercise 15.3 — Trace what happens when Note A is edited.**
If you remove the link to B from A:
1. `fs:writeNote` IPC handler fires → `linkIndex.parseFileLinks('/A.md')`
2. `oldTargets = forwardLinks.get('/A.md')` = `['/B.md', '/C.md']`
3. For each old target, filter out A from its backlinks
4. Re-parse the file → finds only the link to C now
5. `forwardLinks.set('/A.md', ['/C.md'])`
6. Add A→C entry to backLinks for C

**Milestone:** You understand bidirectional link indexing and incremental updates. You can trace what happens to all three data structures when a note is created, edited, or deleted.

---

### Module 16: Full-Text Search

#### Theory

**MiniSearch** uses an inverted index — the same data structure used by search engines like Elasticsearch.

**Normal index:** document → list of words it contains
**Inverted index:** word → list of documents that contain it

When you search for "meeting notes", MiniSearch looks up "meeting" and "notes" in the inverted index, gets the document lists, intersects them, and ranks by relevance.

**TF-IDF** (Term Frequency — Inverse Document Frequency) is the ranking formula:
- TF (term frequency): how often does the word appear in this document? More = more relevant
- IDF (inverse document frequency): how rare is this word across all documents? Rarer = more distinctive = more relevant
- Final score: TF × IDF

MiniSearch configuration in `src/main/search-service.ts` lines 11–19:
- `fields: ['title', 'body']` — index these fields of each document
- `storeFields: ['title', 'path']` — store these fields in the index for retrieval without re-reading files
- `boost: { title: 2 }` — title matches count double (a match in the title is more relevant than in the body)
- `prefix: true` — "meet" matches "meeting"
- `fuzzy: 0.2` — allows up to 20% character differences ("meating" still matches "meeting")

**The `search` method** (line 66):
1. Calls `miniSearch.search(query, { prefix: true, fuzzy: 0.2 })`
2. Takes top 20 results
3. For each result, reads the file and finds the matching lines
4. Returns `SearchResult` objects with path, title, matched lines, and relevance score

Note that it reads files again at search time to get context lines. This is acceptable because search is infrequent and the OS caches recently read files.

#### Exercises

**Exercise 16.1 — Read `src/main/search-service.ts` completely.**
Notice `miniSearch.discard(filePath)` in `updateNote` (line 44) — this removes the old document before re-adding the updated version. The `discard` call is wrapped in try/catch because the document might not be in the index yet (e.g., a newly created file).

**Exercise 16.2 — Experiment with search options.**
Change `fuzzy: 0.2` to `fuzzy: 0` in both the constructor (line 17) and the `search` call (line 69). Restart and try searching with typos — they will no longer match. Change `boost: { title: 2 }` to `boost: { title: 5 }` and observe that title matches rank much higher.

**Exercise 16.3 — Understand the SearchPanel debounce.**
In `src/renderer/components/SearchPanel.tsx` line 34, there is a 200ms debounce on the search input. Every keystroke resets the timer. After 200ms of no typing, `doSearch` fires. This prevents sending an IPC request for every single character, which would create a queue of outdated searches.

**Milestone:** You understand inverted indexes, TF-IDF ranking, and fuzzy matching. You can trace a search query from the input field to the displayed results.

---

### Module 17: Graph Visualization

#### Theory

The graph view uses three D3 libraries:

**d3-force** — physics simulation. Nodes repel each other (charge force), links pull connected nodes together (link force), and all nodes are attracted toward the center (center force). On each simulation "tick", positions update until the simulation converges ("cools down").

**d3-selection** — DOM manipulation. D3's selection API is a jQuery-like but more powerful way to create and update SVG elements based on data arrays.

**d3-zoom** — pan and zoom on SVG. Translates mouse wheel events and drag gestures into SVG transform attributes.

**The data binding pattern** (d3-selection):
```javascript
svg.selectAll('circle')
  .data(nodes)      // bind data array
  .enter()          // for new data without DOM elements
  .append('circle') // create DOM element
  .attr('r', 5)     // set attributes
```

**Forces in `GraphView.tsx` lines 82–87:**
- `forceLink` — pulls connected nodes together, target distance 80px
- `forceManyBody().strength(-100)` — negative = repulsion. Nodes push each other apart.
- `forceCenter` — weak pull toward the center, prevents nodes from drifting off screen
- `forceCollide().radius(20)` — prevents nodes from overlapping

**The simulation tick** (line 151) runs many times per second as the simulation runs. On each tick, node positions (`.x`, `.y`) are updated by the simulation. The tick handler reads these updated positions and moves the SVG elements.

**Why `useCallback` with `[activeFile, onNavigate]` dependency?** The `buildGraph` function captures `activeFile` from props. When `activeFile` changes (user opens a different note), `buildGraph` must be recreated with the new value. The `useEffect` on line 162 depends on `buildGraph`, so it re-runs when `buildGraph` changes, rebuilding the entire graph.

#### Exercises

**Exercise 17.1 — Read `src/renderer/components/GraphView.tsx` and identify the three D3 phases.**
Phase 1 (lines 31–62): data preparation — fetch links and notes, build node map, mark active/connected nodes.
Phase 2 (lines 64–88): setup — clear old SVG, create container group, set up zoom, create simulation.
Phase 3 (lines 90–159): render — create SVG elements for links and nodes, attach drag behavior, attach tick handler.

**Exercise 17.2 — Modify force parameters.**
Change `forceManyBody().strength(-100)` to `.strength(-300)`. Nodes will space out more aggressively. Change `forceLink().distance(80)` to `.distance(200)`. Connected nodes will stay farther apart. Observe how the graph layout changes.

**Exercise 17.3 — Add node color based on link count.**
Modify the node data preparation (around line 40) to count how many links each node has. Then in the `append('circle')` call (line 121), use `.style('fill', d => d.linkCount > 3 ? 'var(--accent)' : 'var(--fg-dim)')` to highlight highly-connected notes.

**Milestone:** You understand force-directed graph layout and D3's data binding pattern. You can modify the graph's visual appearance.

---

## Phase 5: UI Components

### Module 18: CSS and Theming

#### Theory

The entire visual appearance of Nexus Notes is controlled by `src/renderer/styles/global.css`.

**CSS Custom Properties (variables)** are declared in `:root` (the document root element) and referenced with `var(--name)`. They cascade like any CSS property — you can redefine them in a more specific selector to override them.

**The color palette** (lines 1–21) uses the Catppuccin Mocha color scheme:
- `--bg` (`#1e1e2e`) — main background
- `--bg-secondary` (`#181825`) — sidebar and panels
- `--fg` (`#cdd6f4`) — primary text
- `--accent` (`#89b4fa`) — blue highlight, links, active states
- `--border` (`#313244`) — dividers and borders

**CSS Grid layout** (lines 84–101):
```css
.app-layout {
  display: grid;
  grid-template-columns: auto 1fr auto;
}
```
Three columns: sidebar (auto = fits content), center (1fr = takes all remaining space), right panel (auto). When classes are added:
- `.sidebar-hidden` → `grid-template-columns: 0 1fr auto` — sidebar column collapses to zero
- `.right-hidden` → `grid-template-columns: auto 1fr 0` — right panel collapses

This CSS-only approach to hiding panels is elegant — no JavaScript layout calculations needed.

**Creating a light theme:**
All you need to do is redefine the custom properties. Add a class `.light-theme` to `:root` with lighter colors, and toggling that class on the document body switches the entire app's appearance.

#### Exercises

**Exercise 18.1 — Read `src/renderer/styles/global.css` completely.**
For each class selector, understand what element it styles and why. Pay attention to how `.cm-wiki-link` (lines 326–336) styles the decorated editor spans — the color and underline come from CSS, not from CodeMirror itself.

**Exercise 18.2 — Create a light theme.**
Add the following to the bottom of global.css:
```css
.light-theme {
  --bg: #eff1f5;
  --bg-secondary: #e6e9ef;
  --bg-tertiary: #dce0e8;
  --fg: #4c4f69;
  --fg-muted: #6c6f85;
  --fg-dim: #9ca0b0;
  --accent: #1e66f5;
  --border: #ccd0da;
  --sidebar-bg: #e6e9ef;
  --editor-bg: #eff1f5;
  --selection: rgba(30, 102, 245, 0.2);
}
```
Then in `App.tsx`, add a button that toggles the `light-theme` class on `document.documentElement`. Add a `isLightTheme` state with `useState`.

**Exercise 18.3 — Modify the layout grid.**
Change `.app-layout` to have a fixed sidebar width:
```css
grid-template-columns: 260px 1fr 280px;
```
vs the current `auto 1fr auto`. What is the difference? With `auto`, the sidebar sizes to its content. With `260px`, it is always exactly 260px regardless of content.

**Milestone:** You understand CSS custom properties, Grid layout, and how theming works. You can create a new color theme.

---

### Module 19: File Explorer Component

#### Theory

The file explorer is a recursive component tree. `FileExplorer` renders the root and manages state (context menu, drag/drop). `FileTreeItem` renders each node and recurses for directories.

**Recursive React components** work naturally because JSX is just function calls:
```tsx
// FileTreeItem.tsx lines 88-98
{isDir && expanded && node.children?.map((child) => (
  <FileTreeItem
    key={child.path}
    node={child}
    depth={depth + 1}    // increment depth for indentation
    ...
  />
))}
```
Each `FileTreeItem` renders its own children, creating an arbitrarily deep tree. The `key` prop must be unique — using `child.path` is correct because paths are unique within a vault.

**HTML5 Drag and Drop API** — native browser API for drag and drop:
- `draggable` attribute on the element
- `onDragStart` — fired when drag begins, set data with `event.dataTransfer.setData(...)`
- `onDragOver` — fired when dragging over a target, must call `event.preventDefault()` to allow dropping
- `onDrop` — fired when dropped
- `onDragLeave` — fired when drag leaves an element

In `FileTreeItem.tsx`, `draggedNodeRef` in `FileExplorer` holds the currently dragged node (a ref, not state, because it doesn't need to cause re-renders). When a drop fires on a directory target, `handleDrop` in `FileExplorer` moves the file.

**Context menu** — there is no native HTML context menu API beyond `contextmenu` event. The custom implementation in `FileExplorer.tsx`:
1. Intercepts `onContextMenu` (right-click) on each tree item
2. Stores the click position (x, y) and the target node in state
3. Renders a positioned `div` at those coordinates
4. An invisible full-screen overlay behind it captures any click to close it

#### Exercises

**Exercise 19.1 — Read `FileExplorer.tsx` and `FileTreeItem.tsx` completely.**
Trace what happens when you drag `notes.md` from one folder and drop it on `Archive/`:
1. `handleDragStart` (FileTreeItem.tsx line 38) sets `e.dataTransfer` data and calls parent's `onDragStart`
2. Parent (`FileExplorer`) stores the dragged node in `draggedNodeRef`
3. Dragging over `Archive/` folder → `handleDragOver` fires, sets `dragOver: true` state (visual feedback)
4. Dropping → `handleDrop` (FileTreeItem.tsx line 56) calls parent's `onDrop`
5. Parent's `handleDrop` (FileExplorer.tsx line 107) calls `window.api.moveNote(...)`
6. After move completes, `onRefresh()` rebuilds the file tree

**Exercise 19.2 — Add a new context menu action.**
Add "Copy Path" to the context menu that copies the file's absolute path to the clipboard:
1. Add a button in the context menu JSX (FileExplorer.tsx around line 196)
2. Add a handler: `navigator.clipboard.writeText(contextMenu.node.path)`
3. Close the menu afterward

**Milestone:** You understand recursive components, HTML5 drag and drop, and how to implement custom context menus.

---

### Module 20: Search and Toolbar Components

#### Theory

**SearchPanel.tsx** is a modal dialog (overlay). It demonstrates several important patterns:

**Controlled input** — the input's value is always driven by React state:
```tsx
<input value={query} onChange={handleChange} />
```
This is the opposite of an uncontrolled input where you read the DOM value when needed. With controlled inputs, React always knows the current value.

**Focus management** — `useEffect(() => { inputRef.current?.focus() }, [])` focuses the input when the component mounts. The `?` (optional chaining) handles the case where the ref isn't attached yet.

**Keyboard navigation** — the `handleKeyDown` handler (line 37) intercepts ArrowUp, ArrowDown, Enter, and Escape keys to provide keyboard-only usability. `e.preventDefault()` prevents the default behavior (like scrolling the page with arrow keys).

**Click-outside-to-close pattern** (line 66):
```tsx
<div className="search-panel" onClick={onClose}>
  <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
```
Clicking the dark overlay triggers `onClose`. But `e.stopPropagation()` on the dialog prevents the click from bubbling up to the overlay. This is event bubbling control.

**Highlight matching text** — `highlightMatch` (line 52) is a pure function that takes text and a query, finds the matching substring, and wraps it in a `<mark>` element. This returns a `React.ReactNode` (not a string) which React renders with the mark element's default yellow styling (overridden in CSS).

**EditorToolbar.tsx** is simpler — two arrays of button configs rendered with `.map()`. The `onAction` callback passes the action name string to `App.tsx`, which handles it via the `handleToolbarAction` function (lines 52–84 of App.tsx).

#### Exercises

**Exercise 20.1 — Read `SearchPanel.tsx` line by line.**
Note the `debounceRef` (line 14) — it is `useRef<NodeJS.Timeout | null>(null)`, not `useState`. Why? Because changing the ref value (setting the timeout ID) should not cause a re-render. The debounce logic (lines 33–34) is the same pattern used in `WatcherService` — clear any existing timer and set a new one.

**Exercise 20.2 — Add a "Recent files" section to SearchPanel.**
When the query is empty, instead of showing nothing, show the last 5 opened files. You would need to:
1. Add a `recentFiles: string[]` field to the Zustand store
2. Update it in `openNote` in `useVault.ts`
3. Display them in SearchPanel when `query` is empty

**Exercise 20.3 — Add a new toolbar button.**
Add a "Strikethrough" button to `EditorToolbar.tsx` (add to `buttons2` array). The label could be `'~~S~~'`. Then add its action handler in `App.tsx`'s `insertions` object or connect it to the `toggleWrap` function via a new IPC call (or better, via a direct dispatch if you expose the view reference).

**Milestone:** You understand modal overlays, keyboard navigation, and controlled inputs in React.

---

## Phase 6: Integration and Mastery

### Module 21: Full Feature Implementation — Tags

This module guides you through implementing a complete "Tags" feature from scratch. This is not a small exercise — it touches every layer of the application. Complete it section by section.

**The feature:** Users can write `#tag` in notes. The app indexes all tags, shows a tag panel in the right sidebar, and lets users click a tag to find all notes with that tag.

#### Step 1 — Parse tags in the main process

Create `src/main/tag-index.ts`:

```typescript
import * as fs from 'fs'
import * as path from 'path'

const TAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_-]*)/g

export class TagIndex {
  private tagToFiles: Map<string, Set<string>> = new Map()
  private fileToTags: Map<string, string[]> = new Map()

  buildIndex(notePaths: string[]): void {
    this.tagToFiles.clear()
    this.fileToTags.clear()
    for (const p of notePaths) {
      this.parseFileTags(p)
    }
  }

  parseFileTags(filePath: string): void {
    // Remove old entries for this file
    const oldTags = this.fileToTags.get(filePath) || []
    for (const tag of oldTags) {
      this.tagToFiles.get(tag)?.delete(filePath)
    }

    let content = ''
    try { content = fs.readFileSync(filePath, 'utf-8') } catch { return }

    const tags: string[] = []
    TAG_REGEX.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = TAG_REGEX.exec(content)) !== null) {
      tags.push(match[1].toLowerCase())
    }

    this.fileToTags.set(filePath, tags)
    for (const tag of tags) {
      if (!this.tagToFiles.has(tag)) this.tagToFiles.set(tag, new Set())
      this.tagToFiles.get(tag)!.add(filePath)
    }
  }

  removeFile(filePath: string): void {
    const tags = this.fileToTags.get(filePath) || []
    for (const tag of tags) {
      this.tagToFiles.get(tag)?.delete(filePath)
    }
    this.fileToTags.delete(filePath)
  }

  getFilesForTag(tag: string): string[] {
    return Array.from(this.tagToFiles.get(tag.toLowerCase()) || [])
  }

  getAllTags(): { tag: string; count: number }[] {
    return Array.from(this.tagToFiles.entries())
      .map(([tag, files]) => ({ tag, count: files.size }))
      .sort((a, b) => b.count - a.count)
  }

  getTagsForFile(filePath: string): string[] {
    return this.fileToTags.get(filePath) || []
  }
}
```

#### Step 2 — Wire into IPC handlers

In `src/main/ipc-handlers.ts`:
1. Import `TagIndex` and create an instance alongside `linkIndex` and `searchService`
2. In `fs:openVault` handler, call `tagIndex.buildIndex(notes)` after the existing index builds
3. In `fs:writeNote` handler, call `tagIndex.parseFileTags(filePath)`
4. In `fs:createNote`, `fs:deleteNote`, `fs:renameNote` handlers, update the tag index similarly to how link and search indexes are updated
5. Add new handlers:
   - `tags:getAll` → `tagIndex.getAllTags()`
   - `tags:getFilesForTag` → `tagIndex.getFilesForTag(tag)`
   - `tags:getTagsForFile` → `tagIndex.getTagsForFile(filePath)`

#### Step 3 — Expose via preload

In `src/preload/index.ts`, add to the `api` object:
```typescript
getAllTags: (): Promise<{ tag: string; count: number }[]> =>
  ipcRenderer.invoke('tags:getAll'),
getFilesForTag: (tag: string): Promise<string[]> =>
  ipcRenderer.invoke('tags:getFilesForTag', tag),
getTagsForFile: (filePath: string): Promise<string[]> =>
  ipcRenderer.invoke('tags:getTagsForFile', filePath),
```

#### Step 4 — Add state to Zustand store

In `src/renderer/store/vault-store.ts`, add:
```typescript
// State
allTags: { tag: string; count: number }[]
selectedTag: string | null

// Actions
setAllTags: (tags: { tag: string; count: number }[]) => void
setSelectedTag: (tag: string | null) => void
```

#### Step 5 — Create TagPanel component

Create `src/renderer/components/TagPanel.tsx`:
```tsx
import React, { useEffect } from 'react'
import { useVaultStore } from '../store/vault-store'

interface TagPanelProps {
  onOpenNote: (filePath: string) => void
}

export const TagPanel: React.FC<TagPanelProps> = ({ onOpenNote }) => {
  const allTags = useVaultStore((s) => s.allTags)
  const selectedTag = useVaultStore((s) => s.selectedTag)
  const setAllTags = useVaultStore((s) => s.setAllTags)
  const setSelectedTag = useVaultStore((s) => s.setSelectedTag)
  const [tagFiles, setTagFiles] = React.useState<string[]>([])

  useEffect(() => {
    window.api.getAllTags().then(setAllTags)
  }, [])

  const handleTagClick = async (tag: string): Promise<void> => {
    setSelectedTag(tag)
    const files = await window.api.getFilesForTag(tag)
    setTagFiles(files)
  }

  return (
    <div className="tag-panel">
      {allTags.map(({ tag, count }) => (
        <div
          key={tag}
          className={`tag-item ${selectedTag === tag ? 'active' : ''}`}
          onClick={() => handleTagClick(tag)}
        >
          <span className="tag-name">#{tag}</span>
          <span className="tag-count">{count}</span>
        </div>
      ))}
      {selectedTag && tagFiles.length > 0 && (
        <div className="tag-files">
          <div className="tag-files-header">Files tagged #{selectedTag}</div>
          {tagFiles.map((f) => (
            <div key={f} className="tag-file-item" onClick={() => onOpenNote(f)}>
              {f.split(/[/\\]/).pop()?.replace('.md', '') || f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Step 6 — Wire into App.tsx

1. Import `TagPanel`
2. Add a "Tags" tab to the right panel alongside "Links" and "Graph"
3. Add `showTags` boolean to the store and a `toggleTags` action
4. Conditionally render `<TagPanel>` when the Tags tab is active

#### Step 7 — Add a keyboard shortcut

In `App.tsx`'s keyboard handler (lines 87–115), add:
```typescript
} else if (e.key === 't') {
  e.preventDefault()
  toggleTags()
}
```
Now `Ctrl+T` opens the tag panel.

#### Step 8 — Add CSS

Add styles to global.css for `.tag-panel`, `.tag-item`, `.tag-name`, `.tag-count`, `.tag-files`, `.tag-file-item` following the same visual language as the existing backlinks styles.

**This exercise is the real test of understanding.** If you can complete it without referencing external tutorials, you have mastered the architecture.

---

### Module 22: Testing Strategy

#### Theory

Testing Electron apps has three distinct areas, each requiring different tools.

**Unit testing main process services** — these are pure Node.js functions. Use **Vitest** (Vite's built-in test runner, configured similarly to Jest). You can test `FileService`, `LinkIndex`, `SearchService`, and `TagIndex` directly without Electron running.

```typescript
// src/main/__tests__/link-index.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { LinkIndex } from '../link-index'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('LinkIndex', () => {
  let index: LinkIndex
  let tmpDir: string

  beforeEach(() => {
    index = new LinkIndex()
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-test-'))
  })

  it('builds index and resolves links', () => {
    // Create test files
    fs.writeFileSync(path.join(tmpDir, 'a.md'), '# A\n\n[[B]]')
    fs.writeFileSync(path.join(tmpDir, 'b.md'), '# B')

    const paths = [path.join(tmpDir, 'a.md'), path.join(tmpDir, 'b.md')]
    index.buildIndex(tmpDir, paths)

    const backlinks = index.getBacklinks(path.join(tmpDir, 'b.md'))
    expect(backlinks).toHaveLength(1)
    expect(backlinks[0].source).toBe(path.join(tmpDir, 'a.md'))
  })
})
```

**Testing React components** — use **@testing-library/react** which renders components into a virtual DOM and lets you query by accessible roles and text.

**Testing IPC flows** — the hardest to test. Options:
1. Mock `ipcMain` and `ipcRenderer` — complex setup
2. Integration tests using Spectron or Playwright for Electron — test the full app end-to-end
3. Keep IPC handlers thin (just delegation to services) and test the services directly

The current codebase is well-designed for testability: IPC handlers in `ipc-handlers.ts` are thin wrappers around service classes. Testing the service classes covers the core logic.

#### Exercises

**Exercise 22.1 — Set up Vitest.**
Add to `package.json` devDependencies: `"vitest": "^1.0.0"`. Add to scripts: `"test": "vitest"`. Create `src/main/__tests__/link-index.test.ts` and write tests for `buildIndex`, `parseFileLinks`, `removeNote`, and `getAllLinks`.

**Exercise 22.2 — Write a test for SearchService.**
Test that after indexing a file with the word "electron", searching for "electron" returns that file. Test that after `removeNote`, the file no longer appears in results.

**Exercise 22.3 — Write a test for FileService.buildTree.**
You will need to create a temporary directory with a known structure and verify the returned `FileNode` tree matches it. Use `fs.mkdtempSync` for the temp dir and clean up in an `afterEach`.

**Milestone:** You have written at least one passing test for each of the three main services.

---

### Module 23: Build and Distribution

#### Theory

`electron-builder` packages your compiled Electron app into a platform-specific installer.

**The `build` section of `package.json` (lines 55–73):**
- `appId: "com.nexusnotes.app"` — reverse-domain identifier, like an Android package name. Used on macOS for code signing and on Windows for update channels.
- `productName: "Nexus Notes"` — the display name
- `directories.buildResources: "resources"` — where to find app icons
- `files: ["out/**/*"]` — which files to include in the package. Only the compiled output, not source files.
- Platform targets:
  - Windows: `nsis` — creates an installer `.exe`
  - macOS: `dmg` — creates a disk image
  - Linux: `AppImage` — a portable self-contained executable

**Build steps:**
1. `npm run build` — electron-vite compiles TypeScript and bundles the renderer
2. `electron-builder --win/--mac/--linux` — packages the compiled output with the Electron binary

The final executable includes: your compiled app code + the full Chromium browser + the Node.js runtime. This is why Electron apps are large (50–150 MB).

**Auto-updates** — `electron-updater` (from electron-builder) checks a server for new versions and downloads/applies updates. Requires code signing on macOS and Windows for OS security requirements.

**Code signing** — macOS requires apps to be signed with an Apple Developer certificate to avoid Gatekeeper warnings. Windows requires an EV code signing certificate for SmartScreen. Both are paid services.

#### Exercises

**Exercise 23.1 — Run a local build.**
Run `npm run build` and examine the `out/` directory structure. Note the sizes of the output files. The renderer bundle in `out/renderer/assets/` will be large because it includes all of CodeMirror.

**Exercise 23.2 — Run `npm run build:unpack`.**
This builds but does not package into an installer — it produces a directory in `dist/` with the app files. You can run the app directly from this directory. This is faster for testing the production build without installing.

**Exercise 23.3 — Add an app icon.**
Create a `resources/` directory. Electron-builder looks for `icon.ico` (Windows), `icon.icns` (macOS), and `icon.png` (Linux) here. Add a 512x512 PNG icon and rebuild. The icon will appear in the title bar, taskbar, and installer.

**Milestone:** You can produce a working distributable build of the app.

---

### Module 24: Performance and Polish

#### Theory

**React rendering optimization:**

React re-renders a component whenever its state or props change. In the current app, `App.tsx` line 13 destructures many fields from the store in a single call:
```typescript
const { vaultPath, fileTree, activeFile, ... } = useVaultStore()
```
This means `App` re-renders when ANY of those fields changes. For a small app this is fine, but as the app grows you would split this into more granular selectors.

**`React.memo`** prevents re-rendering if props haven't changed:
```typescript
export const FileTreeItem = React.memo<FileTreeItemProps>(({ ... }) => {
  // Only re-renders if props actually change
})
```

**Large vault handling** — `FileService.buildTree` is synchronous and blocks the main process. For vaults with thousands of files, this could cause a noticeable freeze. The fix is to make `buildTree` async and yield between directory levels. Alternatively, stream results progressively.

**Memory profiling** — in DevTools, the Memory tab lets you take heap snapshots and compare them. The main concern in Nexus Notes is listener accumulation: if `onFileChanged` listeners in `useVault.ts` aren't properly cleaned up, each navigation would add a new listener.

**Verify cleanup works** — add `console.log` statements to the cleanup functions in `useVault.ts` to verify they fire when expected.

**Editor performance** — CodeMirror 6 is already highly optimized. Virtual scrolling (only rendering visible lines) makes even 100,000-line files smooth. The decorations in `cm-wiki-link.ts` only scan `view.visibleRanges`, which is correct — never scan the entire document.

**Accessibility** — the current app lacks ARIA attributes. For production quality:
- Add `role`, `aria-label`, `aria-expanded` to tree items
- Ensure keyboard navigation works in all components
- Verify color contrast meets WCAG AA (4.5:1 for normal text)

The accent color `#89b4fa` on `#1e1e2e` background has a contrast ratio of approximately 5.9:1, which passes AA.

#### Exercises

**Exercise 24.1 — Profile re-renders.**
Install React DevTools browser extension (works in Electron via `--remote-debugging-port` flag). Enable the "Highlight updates" option. Type in the editor and observe which components re-render. You should see that only `MarkdownEditor` (or its container) re-renders, not the whole tree — because `handleContentChange` calls `useVaultStore.getState().setActiveContent(content)` directly (App.tsx line 43) rather than using the React state setter.

**Exercise 24.2 — Add `React.memo` to `FileTreeItem`.**
Wrap the component export with `React.memo`. When the active file changes, previously only the old active item and the new active item need to re-render (their `isActive` prop changed). Without memo, every item in the tree re-renders.

**Exercise 24.3 — Test with a large vault.**
Create a script that generates 500 markdown files in nested directories. Open this vault. Measure: how long does the initial load take? How long does searching take? How much memory does the app use? This reveals real-world performance characteristics.

**Milestone:** You can identify performance bottlenecks and apply optimizations. You understand React's re-render model deeply enough to prevent unnecessary renders.

---

## Appendices

### Appendix A: Glossary

| Term | Definition |
|---|---|
| AST | Abstract Syntax Tree — tree representation of parsed code |
| Bundler | Tool that combines many JS modules into fewer output files |
| Chromium | Open-source version of Google Chrome's browser engine |
| Context Bridge | Electron API for safely exposing main-process functions to renderer |
| Debounce | Delay executing a function until a quiet period has passed |
| Decoration | Visual overlay on editor text that does not modify content |
| DOM | Document Object Model — browser's in-memory tree of HTML elements |
| Event Loop | Node.js/browser mechanism for processing async callbacks |
| HMR | Hot Module Replacement — update changed modules without full reload |
| IPC | Inter-Process Communication — message passing between OS processes |
| Inverted Index | Search data structure: word → list of documents containing it |
| JSX | JavaScript XML — HTML-like syntax extension compiled to React.createElement calls |
| Memoize | Cache a computed value and return the cached version if inputs haven't changed |
| Props | Read-only arguments passed from parent to child component |
| Reconciliation | React's process of diffing old and new virtual DOM to compute minimal real DOM changes |
| Ref | React mechanism for holding a mutable value or DOM element reference without causing re-renders |
| Renderer Process | Chromium tab running the web UI in an Electron app |
| Selector | Function that extracts a slice of Zustand state for a component to subscribe to |
| State | Component-owned data that triggers re-renders when changed |
| TF-IDF | Ranking formula: term frequency × inverse document frequency |
| Transaction | CodeMirror 6's immutable description of a state change |
| V8 | Google's JavaScript engine used in Chrome and Node.js |
| Virtual DOM | React's in-memory representation of the UI, diffed against the real DOM |
| ViewPlugin | CodeMirror 6 plugin that runs alongside the view and observes updates |

---

### Appendix B: Recommended Resources

**HTML/CSS/JavaScript:**
- MDN Web Docs (developer.mozilla.org) — the definitive reference for all web APIs
- CSS-Tricks (css-tricks.com) — practical CSS guides
- javascript.info — the most thorough free JavaScript resource

**TypeScript:**
- typescriptlang.org/docs — official handbook, excellent for C/Java programmers
- "Programming TypeScript" by Boris Cherny — book, highly recommended

**React:**
- react.dev — the official docs with interactive examples and modern hooks coverage
- "The Road to React" by Robin Wieruch — free book

**Electron:**
- electronjs.org/docs — official docs
- "Electron in Action" by Steve Kinney — book

**CodeMirror 6:**
- codemirror.net/docs — official reference
- The source code examples in the docs are the best learning material

**D3:**
- d3js.org — official docs
- "Interactive Data Visualization for the Web" by Scott Murray — book, covers D3 thoroughly

**Node.js:**
- nodejs.org/api — official API reference
- "Node.js Design Patterns" by Casciaro & Mammino — advanced

---

### Appendix C: Web vs C/Java Concepts

| C/Java Concept | Web Equivalent | Notes |
|---|---|---|
| `int`, `float`, `char` | `number`, `string` | JS has one number type (IEEE 754 double) |
| `bool` | `boolean` | Same name in TypeScript |
| `NULL` | `null`, `undefined` | Two null-like values in JS |
| `struct` | `interface` (TypeScript) | No runtime cost, compile-time only |
| `class` | `class` | Similar, but prototype-based inheritance |
| `enum` | `'a' \| 'b' \| 'c'` union | String literals as types |
| `#include` | `import from` | Module system, not textual inclusion |
| `void*` | `any` | Avoid both |
| `template<T>` | `<T>` generic | Almost identical syntax |
| threads | async/await + event loop | Single thread, cooperative scheduling |
| mutex/lock | none needed | Single-threaded: no race conditions in JS |
| `malloc`/`free` | automatic (GC) | V8 has a garbage collector |
| header file | `.d.ts` declaration file | Type information only, see `preload/index.d.ts` |
| stack frame | call stack | Same concept, visible in DevTools |
| debugger | DevTools Sources tab | Breakpoints, watch expressions, call stack |
| `printf` | `console.log` | Also: `.warn`, `.error`, `.table` |
| `sizeof` | n/a | Not needed with GC |
| pointer arithmetic | array indexing | No raw memory access |
| `static` method | `static` method | Same keyword, same meaning |
| `private` field | `private` keyword | TypeScript: compile-time only; JS: no enforcement |

---

### Appendix D: Quick Reference — Key Files

| File | Purpose | Key Lines |
|---|---|---|
| `src/main/index.ts` | App entry point, window creation, config | 33–68 (createWindow), 70–128 (app events) |
| `src/main/file-service.ts` | All file system operations | 11–27 (buildTree recursion), 95–112 (listAllNotes walk) |
| `src/main/ipc-handlers.ts` | All IPC channel registrations | Every `ipcMain.handle(...)` call |
| `src/main/watcher-service.ts` | File system watching, debouncing | 20–29 (debounce implementation) |
| `src/main/link-index.ts` | Bidirectional link maps | 33–77 (parseFileLinks), 8–10 (three Maps) |
| `src/main/search-service.ts` | Full-text search with MiniSearch | 11–19 (MiniSearch config), 66–94 (search method) |
| `src/preload/index.ts` | Secure API bridge to renderer | 1–56 (entire file) |
| `src/preload/index.d.ts` | TypeScript declaration for window.api | 1–7 (entire file) |
| `src/renderer/store/vault-store.ts` | Global Zustand state | 4–30 (interface), 32–58 (implementation) |
| `src/renderer/hooks/useVault.ts` | Vault operations and file watcher setup | 51–78 (useEffect with listener setup) |
| `src/renderer/App.tsx` | Root component, layout, keyboard shortcuts | 42–50 (auto-save debounce), 87–115 (shortcuts) |
| `src/renderer/components/Editor/MarkdownEditor.tsx` | CodeMirror 6 setup | 89–163 (editor creation effect) |
| `src/renderer/components/Editor/cm-wiki-link.ts` | Wiki link decorations | 8–21 (buildDecorations), 23–38 (ViewPlugin) |
| `src/renderer/components/Editor/cm-autocomplete.ts` | Wiki link autocomplete | 1–41 (entire file) |
| `src/renderer/components/Editor/cm-smart-edit.ts` | Smart editing behaviors | 200–219 (smart paste), 262–295 (keymap) |
| `src/renderer/components/GraphView.tsx` | D3 force graph | 82–87 (simulation setup), 151–159 (tick handler) |
| `src/renderer/styles/global.css` | All CSS, theming variables | 1–21 (:root variables), 84–101 (grid layout) |
| `electron.vite.config.ts` | Build configuration | 1–20 (entire file) |
| `package.json` | Dependencies and scripts | 18–35 (dependencies), 55–73 (build config) |

---

### Appendix E: The Full Data Flow Diagram

```
USER ACTION
    |
    v
React Component (renderer process)
    |  calls window.api.method(args)
    v
Preload Script (src/preload/index.ts)
    |  ipcRenderer.invoke('channel', args)
    v
[IPC MESSAGE - process boundary]
    |
    v
ipcMain.handle('channel', handler) (src/main/ipc-handlers.ts)
    |  calls service method
    v
Service Class (FileService / LinkIndex / SearchService)
    |  reads/writes file system
    v
OS File System
    |
    |  return value travels back up
    v
ipcMain.handle returns value
    |
    v
ipcRenderer.invoke Promise resolves
    |
    v
window.api.method Promise resolves
    |
    v
React state updated (Zustand store)
    |
    v
React re-renders affected components
    |
    v
Updated UI visible to user

--- SEPARATE FLOW: File Watcher ---

OS File System change detected
    |
    v
chokidar watcher event fires (WatcherService)
    |  debounce 100ms
    v
mainWindow.webContents.send('vault:file-changed', path)
    |
    v
[IPC PUSH - main to renderer]
    |
    v
ipcRenderer.on('vault:file-changed', handler) in preload
    |  calls registered callback
    v
useVault.ts onFileChanged callback
    |  conditionally re-reads file, rebuilds index
    v
Zustand store updated → component re-renders
```

---

*This study plan covers the complete Nexus Notes codebase. Work through it linearly — each module builds on the previous. The exercises are the most important part. Reading about code is not the same as writing it.*
