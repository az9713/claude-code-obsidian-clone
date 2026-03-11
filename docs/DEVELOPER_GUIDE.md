# Nexus Notes Developer Guide

A comprehensive guide for developers with C/C++/Java backgrounds who are new to Electron, React, TypeScript, and the Node.js ecosystem.

---

## Table of Contents

1. [Prerequisites and Environment Setup](#1-prerequisites-and-environment-setup)
2. [Conceptual Foundation](#2-conceptual-foundation)
3. [Electron Explained](#3-electron-explained)
4. [React Explained](#4-react-explained)
5. [Project Setup Walkthrough](#5-project-setup-walkthrough)
6. [Code Walkthrough: Application Startup](#6-code-walkthrough-application-startup)
7. [Adding a New Feature: Word Count Tutorial](#7-adding-a-new-feature-word-count-tutorial)
8. [Adding a New CodeMirror Extension](#8-adding-a-new-codemirror-extension)
9. [Key Libraries Deep Dive](#9-key-libraries-deep-dive)
10. [Common Development Tasks](#10-common-development-tasks)
11. [Build and Packaging](#11-build-and-packaging)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites and Environment Setup

### What You Need Before Writing Any Code

This project is a desktop application built on top of web technologies. Before anything runs, you need a specific set of tools installed on your machine. This section walks through each one.

---

### Node.js

#### What it is

If you come from Java, think of Node.js as the JRE (Java Runtime Environment) for JavaScript, but with a twist: it also handles file system operations, networking, and running scripts from the command line — things a web browser cannot do. JavaScript was originally invented to run inside browsers only. Node.js extracted the V8 JavaScript engine from Chrome and wrapped it in a runtime that can run standalone on your OS.

In this project, Node.js serves two roles:
- It runs the build tools (Vite, TypeScript compiler) during development.
- The Electron main process is literally a Node.js process embedded in the app.

#### How to install

1. Go to https://nodejs.org/
2. Download the **LTS** (Long Term Support) version — not "Current". LTS is the stable version recommended for projects.
3. Run the installer. Accept all defaults. On Windows, make sure "Add to PATH" is checked.

#### How to verify

Open a terminal (Command Prompt, PowerShell, or Windows Terminal on Windows; Terminal on macOS/Linux) and run:

```
node --version
```

You should see something like `v20.11.0`. You need version 18 or higher.

Also verify npm was installed alongside it:

```
npm --version
```

You should see something like `10.2.0`.

---

### npm (Node Package Manager)

#### What it is

npm is the package manager for JavaScript, analogous to:
- **Maven** in Java — it downloads dependencies defined in a config file and builds your project.
- **pip** in Python — it installs packages from a registry.
- **apt/brew** — it manages versioned software packages.

npm comes automatically bundled with Node.js. The central registry at https://www.npmjs.com/ hosts over two million packages — things like React, TypeScript, and all the libraries this project uses.

When you run `npm install`, npm reads `package.json` (described in section 2), downloads every listed dependency into a folder called `node_modules`, and records exact versions in `package-lock.json`. This `node_modules` folder can contain thousands of files and hundreds of megabytes. It is never committed to Git — each developer generates it themselves.

---

### Git

#### What it is

Git is the version control system. You almost certainly already use this. If not:

1. Download from https://git-scm.com/
2. Install with defaults
3. Verify: `git --version`

To clone this project from a remote repository:

```
git clone <repository-url>
cd nexus-notes
```

---

### Code Editor: VS Code

#### Why VS Code

While you can use any editor, VS Code (Visual Studio Code) has first-class support for TypeScript, React, and the entire JavaScript ecosystem. It is free and made by Microsoft.

Download from: https://code.visualstudio.com/

#### Essential extensions to install

Open VS Code, press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS) to open the extensions panel, and install:

- **ESLint** (by Microsoft) — highlights code style violations inline
- **Prettier** (by Prettier) — auto-formats your code on save
- **TypeScript and JavaScript Language Features** — usually already bundled
- **ES7+ React/Redux/React-Native snippets** — shorthand snippets for React
- **GitLens** — enhanced Git integration

#### Configuring Prettier auto-format on save

1. Press `Ctrl+Shift+P`, type "Open User Settings JSON"
2. Add these lines inside the outer `{}`:

```json
"editor.formatOnSave": true,
"editor.defaultFormatter": "esbenp.prettier-vscode"
```

---

### Terminal Basics

You will use the terminal constantly. Here are the commands you need:

| Command | What it does |
|---|---|
| `cd folder-name` | Change into a directory |
| `cd ..` | Go up one directory level |
| `ls` (macOS/Linux) or `dir` (Windows CMD) | List files in current directory |
| `pwd` (macOS/Linux) or `cd` (Windows CMD) | Show current directory path |
| `mkdir folder-name` | Create a new directory |
| `Ctrl+C` | Stop a running process |

When you see instructions like "run `npm install`", that means: open a terminal, navigate to the project folder, and type that command.

---

## 2. Conceptual Foundation

This section explains the core language and ecosystem concepts you will encounter throughout the codebase. Each concept is explained in terms of something you already know from C/C++/Java.

---

### JavaScript vs TypeScript

#### JavaScript

JavaScript is the language web browsers understand natively. It is dynamically typed — variables have no declared type, and a variable can hold any value at any time:

```javascript
let x = 42        // x is a number
x = "hello"       // now x is a string — no error
x = { foo: 1 }   // now x is an object — still no error
```

This is fine for small scripts, but for a large codebase it causes bugs that are very hard to find because the compiler catches nothing.

#### TypeScript

TypeScript is JavaScript with a type system bolted on top. It was created by Microsoft specifically to solve JavaScript's type safety problem. The TypeScript compiler (`tsc`) reads `.ts` files, checks types, and outputs plain `.js` files that browsers and Node.js can actually run.

The type system is similar to Java's, but with key differences:

```typescript
// Java equivalent: int x = 42;
let x: number = 42

// Java equivalent: String name = "Alice";
let name: string = "Alice"

// Java equivalent: boolean isReady = true;
let isReady: boolean = true

// Interface (similar to Java interface, but structural)
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'   // union type — value must be one of these strings
  children?: FileNode[]         // ? means optional
}

// Function with typed parameters and return type
function buildTree(dirPath: string, depth: number): FileNode {
  // ...
}

// Generic types (same concept as Java generics)
function identity<T>(value: T): T {
  return value
}
```

One critical difference from Java: TypeScript's type system is **structural**, not nominal. Two types are compatible if they have the same shape, even if they have different names. This is called "duck typing."

The `.ts` files in `src/main/` and `src/preload/` compile to Node.js JavaScript. The `.tsx` files in `src/renderer/` are TypeScript files that also contain JSX (HTML-like syntax inside JS), discussed in the React section.

---

### Node.js

Think of it this way:
- **JVM** runs Java bytecode
- **Node.js** runs JavaScript bytecode (V8 engine compiles JS to machine code)

Node.js gives JavaScript access to the operating system: file system, networking, processes, environment variables. Without Node.js, JavaScript can only run inside a browser sandbox.

In this project, the Electron main process IS a Node.js process. When you see code like:

```typescript
import * as fs from 'fs'
fs.readFileSync('/path/to/file', 'utf-8')
```

That is Node.js's built-in `fs` module doing file I/O — exactly like Java's `FileReader` or C's `fopen`.

---

### npm and package.json

`package.json` is to npm what `pom.xml` is to Maven, or what `build.gradle` is to Gradle. It is the project manifest.

Open `package.json` in this project's root:

```json
{
  "name": "nexus-notes",
  "version": "1.0.0",
  "description": "An Obsidian-like desktop note-taking app",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "lint": "eslint ."
  },
  "dependencies": {
    "zustand": "^4.5.0",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "electron": "^31.0.0"
  }
}
```

Key sections:

**`scripts`** — Shorthand commands. When you type `npm run dev`, npm runs `electron-vite dev`. This is like defining targets in a Makefile.

**`dependencies`** — Libraries required at runtime (when the app runs). These get bundled into the final app.

**`devDependencies`** — Libraries only needed during development and building. TypeScript, ESLint, and Electron itself are devDependencies because end users do not need them — they just get the compiled app.

**Version syntax:** `^4.5.0` means "version 4.5.0 or higher, but less than 5.0.0" (the major version must match). This is semver (semantic versioning).

After running `npm install`, all packages are downloaded into the `node_modules/` directory. A `package-lock.json` file is also generated, locking the exact resolved versions. You should commit `package-lock.json` but never commit `node_modules/`.

---

### ES Modules (import/export)

JavaScript (since ES2015) has a module system. Instead of C's `#include` or Java's package-level visibility, every file is its own module and you explicitly say what to export and what to import.

**C comparison:**
```c
// mylib.h
int add(int a, int b);

// main.c
#include "mylib.h"
```

**Java comparison:**
```java
// MyLib.java
public class MyLib {
    public static int add(int a, int b) { return a + b; }
}

// Main.java
import com.example.MyLib;
```

**TypeScript/ES Modules:**
```typescript
// math.ts — the module
export function add(a: number, b: number): number {
  return a + b
}

export const PI = 3.14159

// app.ts — the consumer
import { add, PI } from './math'         // named imports
import * as Math from './math'           // import everything as namespace
import { add as sum } from './math'      // rename on import
```

**Default exports** — a module can have one "default" export:
```typescript
// MyClass.ts
export default class MyClass { ... }

// consumer.ts
import MyClass from './MyClass'   // no curly braces for default
```

In this project, React components use default exports (`export default App`), while utilities use named exports. The import paths are relative for local files (`./utils`) or bare for packages (`react`, `zustand`).

---

### async/await

JavaScript is single-threaded but handles concurrency through an **event loop** and **Promises**. This is conceptually similar to Java's `CompletableFuture`, but the syntax is built into the language.

**The problem async solves:**

Reading a file takes time. If your code blocks while waiting, the entire UI freezes. Instead, you say "start reading the file, and call me back when it's done."

**Java CompletableFuture comparison:**
```java
CompletableFuture<String> future = readFileAsync("notes.txt");
future.thenApply(content -> processContent(content));
```

**JavaScript/TypeScript with async/await:**
```typescript
// A function marked "async" always returns a Promise
async function readAndProcess(filePath: string): Promise<void> {
  // "await" suspends this function until the Promise resolves
  // The event loop can do other work while waiting
  const content = await readFile(filePath)   // returns a Promise<string>
  processContent(content)
}
```

`await` can only be used inside an `async` function. If a Promise rejects (like a thrown exception), you handle it with try/catch:

```typescript
async function safeRead(filePath: string): Promise<string | null> {
  try {
    const content = await window.api.readNote(filePath)
    return content
  } catch (error) {
    console.error('Failed to read file:', error)
    return null
  }
}
```

You will see `async/await` throughout this codebase — any time the renderer talks to the main process via IPC, the call is async.

---

### Arrow Functions

Arrow functions are a compact syntax for functions, similar to Java lambdas.

**Java lambda:**
```java
Runnable r = () -> System.out.println("Hello");
Function<String, Integer> len = s -> s.length();
```

**TypeScript arrow functions:**
```typescript
// No parameters
const greet = () => console.log("Hello")

// One parameter (no parentheses needed)
const double = (x: number) => x * 2

// Multiple parameters
const add = (a: number, b: number) => a + b

// Multi-line body — needs explicit return and curly braces
const processNote = (content: string) => {
  const lines = content.split('\n')
  const wordCount = lines.join(' ').split(' ').length
  return wordCount
}
```

One important difference from regular functions: arrow functions do NOT create their own `this` context. They capture `this` from the surrounding scope. This matters a lot in class methods and React components.

In React components you will see arrow functions used as event handlers:

```tsx
<button onClick={() => setCount(count + 1)}>Click</button>
<input onChange={(event) => setValue(event.target.value)} />
```

---

### Destructuring

Destructuring is syntactic sugar for extracting values from objects or arrays. You will see it constantly.

**Object destructuring:**
```typescript
// Instead of:
const name = user.name
const email = user.email

// Write:
const { name, email } = user

// With renaming:
const { name: userName, email: userEmail } = user

// With defaults:
const { name, role = 'guest' } = user

// Nested:
const { address: { city, zip } } = user
```

**Array destructuring:**
```typescript
// Instead of:
const first = arr[0]
const second = arr[1]

// Write:
const [first, second] = arr

// Skip elements:
const [, second, , fourth] = arr
```

**In function parameters** — very common in React:
```typescript
// Instead of:
function FileItem(props) {
  const node = props.node
  const onClick = props.onClick
}

// Write:
function FileItem({ node, onClick }: FileItemProps) {
  // node and onClick are directly available
}
```

**In this codebase** — App.tsx destructures the entire store:
```typescript
const {
  vaultPath, fileTree, activeFile, activeContent,
  toggleSearch, toggleGraph, toggleSidebar
} = useVaultStore()
```

---

### Template Literals

Template literals let you embed expressions inside strings without concatenation.

**C comparison:**
```c
printf("Hello, %s! You have %d notes.\n", name, count);
```

**Java comparison:**
```java
String msg = "Hello, " + name + "! You have " + count + " notes.";
```

**TypeScript template literals:**
```typescript
// Use backticks (`) instead of quotes
const msg = `Hello, ${name}! You have ${count} notes.`

// Multi-line strings (newlines preserved)
const html = `
  <div class="note">
    <h1>${title}</h1>
    <p>${content}</p>
  </div>
`

// Any expression inside ${}
const info = `File size: ${(bytes / 1024).toFixed(2)} KB`
```

In this codebase, template literals appear in path construction, CSS class names, and IPC event names.

---

## 3. Electron Explained

### What Electron Is

Electron is a framework for building desktop applications using web technologies. You write your UI in HTML, CSS, and JavaScript — the same stack used for websites — but the result is a native desktop app (.exe on Windows, .app on macOS, .AppImage on Linux) that users install and run like any other program.

Electron bundles two things together:
1. **Chromium** — Google Chrome's rendering engine (without the browser UI). This is what displays your HTML/CSS/JavaScript UI.
2. **Node.js** — Gives your app access to the file system, OS APIs, and native desktop features.

This explains why Electron apps can be large (often 100+ MB): they ship an entire browser engine.

Well-known apps built with Electron: VS Code, Slack, Discord, Notion, and Obsidian (which directly inspired this project).

---

### Main Process vs Renderer Process

This is the most important architectural concept in Electron. Get this wrong and nothing works.

Think of it as a client-server architecture on a single machine:

```
+------------------------------------------+
|              Electron App                |
|                                          |
|  +----------------+  +----------------+ |
|  |  Main Process  |  |    Renderer    | |
|  |                |  |    Process     | |
|  |  Node.js       |  |                | |
|  |  File system   |  |  Chromium      | |
|  |  OS APIs       |  |  React UI      | |
|  |  Window mgmt   |  |  HTML/CSS/JS   | |
|  |                |  |                | |
|  |  src/main/     |  |  src/renderer/ | |
|  +-------+--------+  +-------+--------+ |
|          |                   |           |
|          +------- IPC -------+           |
+------------------------------------------+
```

**Main Process** (`src/main/`):
- Runs as a Node.js process
- Has full access to the file system, OS, and Electron APIs
- Creates and manages `BrowserWindow` instances (actual windows)
- Handles menus, dialogs, system tray, etc.
- There is exactly ONE main process per app
- Entry point: `src/main/index.ts`

**Renderer Process** (`src/renderer/`):
- Runs inside a Chromium (browser) sandbox
- Displays the UI using HTML, CSS, React
- By default, has NO access to Node.js APIs or the file system
- Each BrowserWindow has its own renderer process
- Entry point: `src/renderer/main.tsx`

**Why the separation?** Security. If a user opens a malicious note containing JavaScript, that code runs in the renderer. Without isolation, it could read your files, execute programs, or do anything the OS allows. The renderer is sandboxed like a web page.

**The sandbox creates a problem:** Your note editor (renderer) needs to read and write files. But the renderer has no file system access. The solution is IPC.

---

### IPC Communication

IPC stands for Inter-Process Communication. It is the mechanism for the renderer to ask the main process to do things on its behalf.

Think of it like a network socket between two processes, but built into Electron:

```
Renderer Process                    Main Process
     |                                   |
     |  invoke('fs:readNote', '/path')   |
     |---------------------------------->|
     |                                   |  fs.readFileSync('/path')
     |                                   |
     |  return "# My Note\n..."          |
     |<----------------------------------|
     |                                   |
```

**Two directions of communication:**

1. **Renderer asks Main (invoke/handle):** The renderer sends a request and waits for a response. This is used for file operations.

```typescript
// In renderer (src/preload/index.ts exposes this):
const content = await window.api.readNote('/path/to/note.md')

// Under the hood in preload:
ipcRenderer.invoke('fs:readNote', '/path/to/note.md')

// Main process handles it (src/main/ipc-handlers.ts):
ipcMain.handle('fs:readNote', async (_event, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8')
})
```

2. **Main pushes to Renderer (send/on):** The main process sends a message the renderer didn't request. This is used for file watching events.

```typescript
// Main process sends (src/main/watcher-service.ts):
mainWindow.webContents.send('vault:file-changed', '/path/to/changed.md')

// Renderer listens (src/preload/index.ts):
ipcRenderer.on('vault:file-changed', (event, filePath) => {
  // called whenever a file changes on disk
})
```

The channel names (like `'fs:readNote'` and `'vault:file-changed'`) are just strings — arbitrary names you choose. By convention in this project, they use the format `namespace:action`.

---

### The Preload Script and contextBridge

Here is a subtlety that confuses almost everyone new to Electron.

The renderer runs in a sandbox with no Node.js access. But then how does `window.api.readNote()` work? The renderer calls a function that invokes IPC — isn't that a Node.js API?

Answer: The **preload script** (`src/preload/index.ts`) is the bridge. It runs in a special context that has access to BOTH `ipcRenderer` (Electron API) AND the browser's `window` object. It runs BEFORE the renderer's JavaScript executes.

The `contextBridge.exposeInMainWorld('api', api)` call in `src/preload/index.ts` takes an object defined in the preload context and safely copies it into the renderer's `window` object:

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  readNote: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:readNote', filePath),
  // ... more methods
}

// This creates window.api in the renderer
contextBridge.exposeInMainWorld('api', api)
```

After this runs, the renderer can call `window.api.readNote()` without knowing anything about IPC or Node.js.

**The `src/preload/index.d.ts` file** extends TypeScript's `Window` interface so TypeScript knows `window.api` exists:

```typescript
// src/preload/index.d.ts
import { Api } from './index'

declare global {
  interface Window {
    api: Api
  }
}
```

This is a "type declaration file" — it adds type information without adding runtime code.

---

### Why There Are 3 TypeScript Configs

Looking at the root of the project, you will find:
- `tsconfig.json` — root config, just references the other two
- `tsconfig.node.json` — config for main process and preload
- `tsconfig.web.json` — config for renderer

This is because the main/preload code and the renderer code run in completely different environments:

**`tsconfig.node.json`** covers `src/main/` and `src/preload/`:
- Target: Node.js environment
- Has access to Node.js built-in modules (`fs`, `path`, etc.)
- CommonJS or ESM module format
- No browser globals (no `window`, `document`)

**`tsconfig.web.json`** covers `src/renderer/`:
- Target: Browser/Chromium environment
- Has access to browser globals (`window`, `document`, `localStorage`)
- NO access to Node.js built-ins
- `"jsx": "react-jsx"` enables JSX transformation
- Defines the `@renderer` path alias

If you mixed them into one config, TypeScript would either complain about browser APIs in the main process or Node.js APIs in the renderer.

---

### electron-vite: The Build System

This project uses **electron-vite** (not plain Vite) as its build system. Understanding what it does helps when things go wrong.

**What Vite is:** A modern build tool for web projects. It bundles JavaScript modules, handles TypeScript compilation, manages imports, and provides a dev server with hot reload. Think of it as the webpack/gradle of the JavaScript world.

**What electron-vite adds:** It runs three Vite build processes simultaneously — one for main, one for preload, one for renderer — each with the right settings for their respective environments.

```
electron-vite dev
    |
    +-- builds src/main/     -> out/main/index.js    (Node.js, ESM)
    +-- builds src/preload/  -> out/preload/index.js  (Node.js, CJS)
    +-- builds src/renderer/ -> dev server on http://localhost:5173
    |
    +-- starts Electron, pointing it at the dev server
```

The `electron.vite.config.ts` file in the project root configures this:

```typescript
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]  // don't bundle node_modules for main
  },
  preload: {
    plugins: [externalizeDepsPlugin()]  // same for preload
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer')  // @renderer/... path alias
      }
    },
    plugins: [react()]  // enables React/JSX compilation
  }
})
```

The `externalizeDepsPlugin()` tells Vite NOT to bundle node_modules into the main/preload output — instead, Node.js will require them at runtime from `node_modules/`. This is correct behavior for Node.js code. The renderer bundles its dependencies normally because Chromium cannot `require()` from the file system.

---

## 4. React Explained

### What React Is

React is a JavaScript library for building user interfaces. It was created by Facebook (now Meta) and is currently the most widely used UI library in the JavaScript ecosystem.

**The core idea:** Instead of manually manipulating the DOM (the browser's internal tree of HTML elements), you write components that *describe* what the UI should look like given the current data. When data changes, React figures out what changed and updates only the relevant DOM nodes efficiently.

From a Java perspective, React components are like custom UI widget classes. An `App` component is like a top-level `JFrame` that contains other components like `JPanel`, `JButton`, `JLabel` — except you compose them declaratively rather than imperatively.

---

### JSX and TSX

JSX (JavaScript XML) is a syntax extension that lets you write HTML-like markup directly inside JavaScript/TypeScript code. `.tsx` files are TypeScript files with JSX enabled.

This looks strange at first but becomes natural quickly:

```tsx
// This is valid TypeScript/JSX:
function Greeting({ name }: { name: string }) {
  return (
    <div className="greeting">
      <h1>Hello, {name}!</h1>
      <p>Welcome to Nexus Notes.</p>
    </div>
  )
}
```

JSX is NOT HTML — it gets compiled to regular function calls:

```javascript
// What the compiler turns the above into:
function Greeting({ name }) {
  return React.createElement('div', { className: 'greeting' },
    React.createElement('h1', null, 'Hello, ', name, '!'),
    React.createElement('p', null, 'Welcome to Nexus Notes.')
  )
}
```

**Key differences from HTML:**
- `class` becomes `className` (because `class` is a reserved word in JavaScript)
- `for` becomes `htmlFor`
- All tags must be closed: `<input />`, not `<input>`
- JavaScript expressions go inside `{}`: `<p>{count} notes</p>`
- Event handlers are camelCase: `onClick`, `onChange`, `onKeyDown`

---

### Components

A React component is a function that accepts props (properties, like constructor parameters) and returns JSX.

```tsx
// Functional component — this is the modern React style
interface NoteCardProps {
  title: string
  preview: string
  isActive: boolean
  onClick: () => void  // function type: no arguments, returns nothing
}

const NoteCard: React.FC<NoteCardProps> = ({ title, preview, isActive, onClick }) => {
  return (
    <div
      className={isActive ? 'note-card active' : 'note-card'}
      onClick={onClick}
    >
      <h3>{title}</h3>
      <p>{preview}</p>
    </div>
  )
}

export { NoteCard }
```

`React.FC` stands for "Function Component". The `<NoteCardProps>` is a TypeScript generic that tells React what props this component accepts.

Components are composed by nesting them like HTML elements:

```tsx
function NoteList({ notes }: { notes: Note[] }) {
  return (
    <div className="note-list">
      {notes.map(note => (
        <NoteCard
          key={note.path}          // React needs a unique key for lists
          title={note.title}
          preview={note.preview}
          isActive={note.path === activeFile}
          onClick={() => openNote(note.path)}
        />
      ))}
    </div>
  )
}
```

---

### Props

Props are the input parameters of a component. They flow one direction: parent to child. A child component cannot modify its own props (they are read-only), just like function parameters.

```tsx
// Parent passes data down:
<MarkdownEditor
  content={activeContent}
  filePath={activeFile}
  onContentChange={handleContentChange}
  onNavigate={navigateToLink}
/>

// Child receives and uses them:
const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  filePath,
  onContentChange,
  onNavigate
}) => {
  // use content, filePath, etc.
}
```

When a prop changes, React re-renders the child component with the new prop values.

---

### State and Hooks

**State** is mutable data that lives inside a component. When state changes, React re-renders that component and all its children. Think of it as instance variables in a Java object — but when you update them, the UI automatically re-renders.

React provides built-in functions called **Hooks** for managing state and other side effects. Hooks always start with `use`.

#### useState

The most fundamental hook. Creates a piece of state and a function to update it.

```tsx
import { useState } from 'react'

function Counter() {
  // Declare state: current value + setter function
  // Initial value is 0
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

**Critical rule:** NEVER mutate state directly. Always use the setter:
```typescript
// WRONG — React won't know to re-render:
count = count + 1

// CORRECT — React sees the change and re-renders:
setCount(count + 1)
```

#### useEffect

Runs side effects after a render. Side effects are anything that affects things outside the component: API calls, timers, event listeners, DOM manipulation.

```tsx
import { useEffect, useState } from 'react'

function VaultLoader({ vaultPath }: { vaultPath: string }) {
  const [notes, setNotes] = useState<string[]>([])

  useEffect(() => {
    // This runs after the component renders AND whenever vaultPath changes
    async function loadNotes() {
      const noteList = await window.api.listAllNotes(vaultPath)
      setNotes(noteList)
    }
    loadNotes()

    // Optional cleanup function — runs before the next effect or unmount
    return () => {
      // Clean up subscriptions, timers, etc.
    }
  }, [vaultPath])  // dependency array — effect re-runs when vaultPath changes

  // Empty dependency array [] means "run once after first render"
  // No array at all means "run after every render" (usually wrong)

  return <div>{notes.length} notes loaded</div>
}
```

In `App.tsx`, the initialization uses `useEffect` with `[]` to load the saved vault once on startup:

```tsx
useEffect(() => {
  const init = async () => {
    const saved = await window.api.getSavedVault()
    if (saved) {
      await loadVault(saved)
    }
    setLoading(false)
  }
  init()
}, [])  // [] = run once on mount
```

#### useRef

Holds a mutable value that does NOT cause re-renders when changed. Like a Java instance variable that you can change freely without triggering UI updates. Used for:
- Holding a reference to a DOM element
- Storing a timer ID
- Keeping track of something between renders without displaying it

```tsx
const containerRef = useRef<HTMLDivElement>(null)
const viewRef = useRef<EditorView | null>(null)
const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

// Access the value with .current:
if (viewRef.current) {
  viewRef.current.dispatch(...)
}

// Attach to DOM elements:
<div ref={containerRef} className="editor-container" />
// After render: containerRef.current is the actual DOM element
```

In `MarkdownEditor.tsx`, `viewRef` holds the CodeMirror `EditorView` instance. Updating it does not trigger a re-render, which is correct — the CodeMirror editor manages its own DOM.

#### useCallback

Returns a memoized version of a callback function. The function is only recreated if its dependencies change. This prevents child components from re-rendering unnecessarily when the parent re-renders.

```typescript
// Without useCallback — new function created every render:
const handleClick = () => { doSomething(activeFile) }

// With useCallback — same function reference if activeFile hasn't changed:
const handleClick = useCallback(() => {
  doSomething(activeFile)
}, [activeFile])  // only recreate when activeFile changes
```

---

### Component Lifecycle

React functional components have a simple lifecycle:

1. **Mount** — Component is first added to the DOM. `useEffect` with `[]` runs.
2. **Update** — Props or state change, causing a re-render. `useEffect` runs if its dependencies changed.
3. **Unmount** — Component is removed from the DOM. Cleanup functions from `useEffect` run.

```
Component mounted
    |
    v
useEffect runs (if [] or matching deps changed)
    |
    v
User interaction / prop change
    |
    v
Component re-renders
    |
    v
useEffect cleanup runs (if deps changed)
useEffect runs again (if deps changed)
    |
    v
Component unmounted
    |
    v
useEffect cleanup runs
```

---

### How React Renders (Virtual DOM)

When you call `setCount(5)`, React does not immediately update the real DOM. Instead:

1. React creates a new "virtual DOM" — a lightweight JavaScript representation of the UI tree
2. It diffs the new virtual DOM against the previous one (the "reconciliation" step)
3. It applies only the minimal set of real DOM changes

This is efficient because real DOM operations are slow. Calculating a JavaScript object diff is fast.

This is why the "key" prop on list items is important:

```tsx
{notes.map(note => (
  <NoteCard key={note.path} title={note.title} />
))}
```

The `key` tells React how to match elements between renders. Without unique stable keys, React can match the wrong elements and produce incorrect UI.

---

## 5. Project Setup Walkthrough

### Cloning the Repository

```
git clone <repository-url>
cd nexus-notes
```

If you are working from the already-downloaded folder:

```
cd C:\Users\simon\Downloads\cc_obsidean_tutorial
```

### Running npm install

```
npm install
```

**What happens when you run this:**

1. npm reads `package.json`
2. npm reads `package-lock.json` (if it exists) to get exact version pins
3. npm downloads every listed dependency from the npm registry (https://registry.npmjs.org/)
4. Dependencies are placed in `node_modules/` — a folder at the project root
5. Each dependency's own dependencies are also downloaded (transitive dependencies)
6. The `postinstall` script defined in `package.json` runs: `electron-builder install-app-deps`, which downloads platform-specific Electron binaries

This takes 1–5 minutes on first run. You should see hundreds of packages being downloaded. On subsequent runs it is nearly instant if `node_modules/` already exists.

**If something goes wrong:**
```
# Delete node_modules and package-lock.json, then reinstall fresh
rm -rf node_modules package-lock.json
npm install
```

### Project File Structure Explained

```
nexus-notes/
|
+-- src/                        All application source code
|   |
|   +-- main/                   Main process (Node.js, runs natively)
|   |   +-- index.ts            Entry point: creates BrowserWindow, sets up app lifecycle
|   |   +-- ipc-handlers.ts     Registers all IPC request handlers
|   |   +-- file-service.ts     File system operations (read, write, create, delete)
|   |   +-- link-index.ts       Parses [[wiki links]] and maintains backlink index
|   |   +-- search-service.ts   Full-text search using MiniSearch
|   |   +-- watcher-service.ts  File system watching using chokidar
|   |   +-- types.ts            Shared TypeScript types for main process
|   |
|   +-- preload/                Preload script (bridge between main and renderer)
|   |   +-- index.ts            Defines the window.api object, exposes via contextBridge
|   |   +-- index.d.ts          Type declarations so renderer TypeScript knows about window.api
|   |
|   +-- renderer/               Renderer process (runs in Chromium, the React UI)
|       +-- main.tsx            React entry point: mounts <App /> into the DOM
|       +-- App.tsx             Root React component: layout, routing, keyboard shortcuts
|       |
|       +-- store/
|       |   +-- vault-store.ts  Zustand global state store
|       |
|       +-- hooks/
|       |   +-- useVault.ts     Custom hook: vault loading, note opening, file watching
|       |   +-- useLinks.ts     Custom hook: link and backlink operations
|       |   +-- useSearch.ts    Custom hook: search operations
|       |
|       +-- components/
|       |   +-- Editor/
|       |   |   +-- MarkdownEditor.tsx   CodeMirror editor component
|       |   |   +-- cm-wiki-link.ts      CodeMirror extension: highlight [[wiki links]]
|       |   |   +-- cm-autocomplete.ts   CodeMirror extension: [[link]] autocomplete
|       |   |   +-- cm-smart-edit.ts     CodeMirror extension: smart Enter/Tab/Ctrl+B etc.
|       |   |   +-- cm-drop-handler.ts   CodeMirror extension: drag-and-drop files
|       |   +-- Sidebar/
|       |   |   +-- FileExplorer.tsx     Left sidebar file tree
|       |   |   +-- FileTreeItem.tsx     Individual file/folder item in the tree
|       |   +-- EditorToolbar.tsx        Bold/italic/etc. toolbar buttons
|       |   +-- BacklinksPanel.tsx       Right panel: shows files linking to current note
|       |   +-- SearchPanel.tsx          Full-text search overlay (Ctrl+Shift+F)
|       |   +-- GraphView.tsx            D3 force graph of note connections
|       |
|       +-- lib/
|       |   +-- types.ts        Shared TypeScript types for renderer
|       |   +-- api.ts          Any additional API utilities
|       |
|       +-- styles/
|           +-- global.css      All CSS for the application
|
+-- resources/                  App icons, assets used by electron-builder
+-- out/                        Compiled output (generated by build, don't edit)
+-- node_modules/               Installed packages (generated by npm install, don't edit)
+-- package.json                Project manifest and script definitions
+-- package-lock.json           Locked dependency versions (commit this)
+-- tsconfig.json               Root TypeScript config (references the two below)
+-- tsconfig.node.json          TypeScript config for main + preload
+-- tsconfig.web.json           TypeScript config for renderer
+-- electron.vite.config.ts     Build configuration for electron-vite
```

### npm run dev: What Happens Step by Step

Type `npm run dev` in the terminal at the project root.

npm looks up the `dev` script in `package.json`:
```json
"dev": "electron-vite dev"
```

electron-vite starts three concurrent processes:

**Step 1: Build main process**
- TypeScript compiler processes `src/main/index.ts` and all its imports
- Output: `out/main/index.js` (a Node.js bundle)

**Step 2: Build preload script**
- TypeScript compiler processes `src/preload/index.ts`
- Output: `out/preload/index.js`

**Step 3: Start renderer dev server**
- Vite starts an HTTP dev server, typically on port 5173
- It processes `src/renderer/main.tsx` and builds a bundle in memory
- When you change a file, Vite re-processes only what changed and pushes the update via WebSocket

**Step 4: Start Electron**
- electron-vite launches the Electron process, executing `out/main/index.js`
- The main process creates a `BrowserWindow`
- Because `is.dev` is true, the window loads `http://localhost:5173` (the Vite dev server)
- The renderer process fetches the app from Vite, loading React, etc.
- The app appears on screen

You will see two sets of console output interleaved: Node.js/Electron logs and Vite's dev server logs.

### How Hot Reload Works

When you edit a file in `src/renderer/`:
1. Vite's file watcher detects the change
2. Vite re-compiles only the changed module and its dependents (not the entire app)
3. Vite sends the new module to the browser via a WebSocket connection
4. React's Fast Refresh (HMR — Hot Module Replacement) swaps the new module in place
5. The component re-renders with preserved state

For changes to `src/main/`:
1. electron-vite detects the change
2. Rebuilds the main process bundle
3. Restarts the Electron main process
4. Re-creates the window, which reloads the renderer

This is why main process changes feel "heavier" — the whole window reloads — while renderer changes are near-instant.

---

## 6. Code Walkthrough: Application Startup

This section traces the exact sequence of code execution from launching the app to a note appearing in the editor. Follow along by opening each file in VS Code.

### Step 1: Electron Loads main/index.ts

When you run `npm run dev`, Electron executes `out/main/index.js` (the compiled version of `src/main/index.ts`).

```typescript
// src/main/index.ts
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
```

Electron's `app` object represents the application itself. The very first thing the code does is wait for Electron to finish initializing:

```typescript
app.whenReady().then(async () => {
  // App is ready — OS has given us permission to create windows
  electronApp.setAppUserModelId('com.nexusnotes.app')

  // Register all IPC request handlers BEFORE creating the window
  registerIpcHandlers()

  // Register vault-specific IPC handlers
  ipcMain.handle('vault:select', async () => { ... })
  ipcMain.handle('vault:getSaved', () => { ... })
  // ...

  // Finally, create the window
  createWindow()
})
```

`registerIpcHandlers()` is called here and it imports `FileService`, `LinkIndex`, and `SearchService`, instantiating them. These are the backend services that do the actual work.

### Step 2: BrowserWindow Created

`createWindow()` is called:

```typescript
function createWindow(): void {
  const config = loadConfig()              // read ~/.nexusnotes/config.json
  const bounds = config.windowBounds || { width: 1200, height: 800 }

  mainWindow = new BrowserWindow({
    ...bounds,
    show: false,                           // Don't show yet — wait for content to load
    autoHideMenuBar: true,
    title: 'Nexus Notes',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),  // <-- critical line
      sandbox: false
    }
  })
```

The `preload` option points to the compiled preload script. Electron will execute this script in a special context before the renderer page loads.

`show: false` prevents a white flash — the window is hidden until `ready-to-show` fires:

```typescript
mainWindow.on('ready-to-show', () => {
  mainWindow!.show()
})
```

Then the window loads the app:

```typescript
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])  // dev server URL
} else {
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))  // production
}
```

### Step 3: Preload Script Runs

Before any renderer JavaScript executes, Electron runs `src/preload/index.ts`. This script has access to Electron's `ipcRenderer` AND the page's `window` object.

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectVault: (): Promise<string | null> =>
    ipcRenderer.invoke('vault:select'),

  readNote: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('fs:readNote', filePath),

  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void =>
      callback(filePath)
    ipcRenderer.on('vault:file-changed', handler)
    return () => ipcRenderer.removeListener('vault:file-changed', handler)
  },
  // ... 20+ more methods
}

// Safely expose the api object to the renderer's window
contextBridge.exposeInMainWorld('api', api)
```

After this runs, `window.api` is available in the renderer. The renderer can now call `window.api.readNote(path)` which sends an IPC message to the main process.

### Step 4: Renderer Loads → main.tsx → App.tsx

The browser loads `index.html` (in dev mode, served by Vite). That HTML file contains a `<script>` tag pointing to `src/renderer/main.tsx` (which Vite compiles and serves).

`main.tsx` is the React entry point:

```tsx
// src/renderer/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Find the <div id="root"> in index.html and mount React there
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`ReactDOM.createRoot` creates a React rendering root at the `<div id="root">` element and renders the `App` component tree into it. From this point on, React manages the DOM.

`App` is the root component defined in `src/renderer/App.tsx`.

### Step 5: Vault Selection / Loading

Inside `App.tsx`, the initialization `useEffect` runs immediately after the component first renders:

```tsx
// src/renderer/App.tsx
useEffect(() => {
  const init = async () => {
    const saved = await window.api.getSavedVault()  // IPC call to main
    if (saved) {
      await loadVault(saved)
    }
    setLoading(false)
  }
  init()
}, [])  // empty deps = run once on mount
```

`window.api.getSavedVault()` sends `vault:getSaved` to the main process, which reads `~/.nexusnotes/config.json` and returns the stored vault path (or `null`).

If no saved vault exists, `setLoading(false)` runs and the component renders the vault selection screen:

```tsx
if (!vaultPath) {
  return (
    <div className="vault-select-screen">
      <h1>Nexus Notes</h1>
      <p>Select a folder to use as your vault</p>
      <button className="vault-select-btn" onClick={handleSelectVault}>
        Open Vault
      </button>
    </div>
  )
}
```

When the user clicks "Open Vault", `handleSelectVault` calls `window.api.selectVault()` which triggers Electron's native folder picker dialog. The user selects a folder, the path is returned, and `loadVault(path)` is called.

### Step 6: File Tree Loads

`loadVault` is defined in `src/renderer/hooks/useVault.ts`:

```typescript
const loadVault = useCallback(async (vaultPath: string) => {
  store.setVaultPath(vaultPath)              // update Zustand store

  const tree = await window.api.openVault(vaultPath)  // IPC: scan directory
  store.setFileTree(tree)                    // store the file tree

  await window.api.startWatching(vaultPath)  // IPC: start chokidar watcher

  const names = await window.api.getAllNoteNames()  // IPC: get note name list
  store.setNoteNames(names)                  // store for autocomplete
}, [])
```

`window.api.openVault(vaultPath)` invokes the `fs:openVault` IPC handler in `ipc-handlers.ts`:

```typescript
ipcMain.handle('fs:openVault', async (_e, dirPath: string) => {
  const tree = await FileService.openVault(dirPath)   // recursive directory scan
  const notes = await FileService.listAllNotes(dirPath)
  linkIndex.buildIndex(dirPath, notes)    // parse all [[wiki links]]
  searchService.buildIndex(dirPath, notes) // index all note content
  return tree   // returns a FileNode tree
})
```

`FileService.openVault` recursively walks the directory tree and returns a `FileNode` object:

```typescript
// A FileNode looks like:
{
  name: "My Vault",
  path: "/Users/me/notes",
  type: "directory",
  children: [
    {
      name: "Daily Notes",
      path: "/Users/me/notes/Daily Notes",
      type: "directory",
      children: [
        { name: "2024-01-15.md", path: "/Users/me/notes/Daily Notes/2024-01-15.md", type: "file" }
      ]
    },
    { name: "Projects.md", path: "/Users/me/notes/Projects.md", type: "file" }
  ]
}
```

This `FileNode` tree is stored in Zustand (`store.setFileTree(tree)`). Since the store changes, React re-renders `App.tsx`, which now has a `vaultPath` and `fileTree`, so it renders the full layout with the `FileExplorer` sidebar.

The `FileExplorer` component receives `fileTree` as a prop and renders `FileTreeItem` components recursively to display the tree.

### Step 7: User Clicks a File → Editor Opens

When the user clicks a file in the sidebar, `FileExplorer` calls `onFileClick(node.path)`, which is `openNote` from `useVault.ts`:

```typescript
const openNote = useCallback(async (filePath: string) => {
  const content = await window.api.readNote(filePath)  // IPC: read file
  store.setActiveFile(filePath)      // update store
  store.setActiveContent(content)    // update store

  const backlinks = await window.api.getBacklinks(filePath)  // IPC: get backlinks
  store.setBacklinks(backlinks)      // update store
}, [])
```

This updates the Zustand store. `App.tsx` reads `activeFile` and `activeContent` from the store. Since they changed, React re-renders and the center panel now renders `MarkdownEditor` instead of the empty state:

```tsx
{activeFile ? (
  <>
    <EditorToolbar onAction={handleToolbarAction} />
    <MarkdownEditor
      content={activeContent}
      filePath={activeFile}
      onContentChange={handleContentChange}
      onNavigate={navigateToLink}
    />
  </>
) : (
  <div className="empty-editor">Select a note or press Ctrl+N to create one</div>
)}
```

`MarkdownEditor` mounts for the first time. Its `useEffect` (with `[]` dep array) runs, creating a CodeMirror `EditorView` and mounting it into the `<div ref={containerRef}>`. The editor appears with the note's content.

When `activeContent` changes (different file selected), the second `useEffect` in `MarkdownEditor` runs:

```typescript
useEffect(() => {
  const view = viewRef.current
  if (!view) return
  if (view.state.doc.toString() !== content) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content }
    })
  }
}, [content, filePath])
```

This replaces the entire document content in CodeMirror. The editor updates without being destroyed and recreated.

---

## 7. Adding a New Feature: Word Count Tutorial

This tutorial adds a "Word Count" display that shows the word count of the currently open note in the bottom of the editor. This exercises every layer of the stack.

The final result: a small status bar at the bottom of the editor showing "Words: 342 | Characters: 1,847".

### Overview of the Changes

We will touch these files:
1. `src/main/ipc-handlers.ts` — Add a word count IPC handler
2. `src/preload/index.ts` — Expose the word count function to the renderer
3. `src/renderer/store/vault-store.ts` — Add word count state
4. `src/renderer/components/Editor/WordCount.tsx` — Create the component
5. `src/renderer/components/Editor/MarkdownEditor.tsx` — Wire in the component
6. `src/renderer/styles/global.css` — Add styling

### Step 1: Add IPC Handler in ipc-handlers.ts

Open `src/main/ipc-handlers.ts`. We will add a new handler that counts words in a string.

In this case, word counting is simple enough that we could do it entirely in the renderer — but this tutorial demonstrates the pattern of adding a main process handler, which is essential for heavier operations like reading files.

Find the end of the `registerIpcHandlers` function (just before the closing `}`):

```typescript
// src/main/ipc-handlers.ts
// Add this near the end of registerIpcHandlers(), before the closing }

  ipcMain.handle('text:wordCount', (_e, content: string) => {
    const text = content.trim()
    if (!text) {
      return { words: 0, characters: 0 }
    }
    // Split on whitespace to count words
    const words = text.split(/\s+/).filter(w => w.length > 0).length
    const characters = content.length
    return { words, characters }
  })
```

**What is happening here:**
- `ipcMain.handle` registers a handler for the channel name `'text:wordCount'`
- The first argument `_e` is the IPC event object (we don't need it, so we prefix with `_` to indicate intentionally unused)
- The second argument `content` is whatever the renderer passes when it invokes this channel
- The return value is automatically sent back to the renderer as the resolved Promise value
- We return a plain object `{ words, characters }` — TypeScript will infer its type

### Step 2: Add API Method in preload/index.ts

Open `src/preload/index.ts`. Add the word count method to the `api` object.

Find the `// Search` comment block and add after it:

```typescript
// src/preload/index.ts
// Add inside the api object, after the search entry:

  // Text utilities
  getWordCount: (content: string): Promise<{ words: number; characters: number }> =>
    ipcRenderer.invoke('text:wordCount', content),
```

The full `api` object after your change should now have a `getWordCount` method. The TypeScript type `Promise<{ words: number; characters: number }>` precisely describes what the IPC handler returns.

Because the `Api` type is exported with `export type Api = typeof api`, the `index.d.ts` declaration file will automatically include the new method. The renderer will have type-safe access to `window.api.getWordCount(content)`.

### Step 3: Add State to vault-store.ts

Open `src/renderer/store/vault-store.ts`. We need to add `wordCount` state so the count can be displayed from any component without prop-drilling.

First, add `wordCount` to the `VaultState` interface:

```typescript
// src/renderer/store/vault-store.ts
// In the VaultState interface, add after searchQuery:

  wordCount: { words: number; characters: number }
  setWordCount: (count: { words: number; characters: number }) => void
```

Then add the initial value and setter to the `create(...)` call. Find the line `setNoteNames: (names) => set({ noteNames: names })` and add after it:

```typescript
// src/renderer/store/vault-store.ts
// In the create() call, add after setNoteNames:

  wordCount: { words: 0, characters: 0 },
  setWordCount: (count) => set({ wordCount: count }),
```

**What is Zustand doing here?** The `create` function creates a store object. Every key that is a value is state. Every key that is a function that calls `set(...)` is an action that updates state. When `setWordCount` is called anywhere in the app, all components subscribed to `wordCount` will automatically re-render with the new value.

### Step 4: Create the WordCount Component

Create a new file: `src/renderer/components/Editor/WordCount.tsx`

```tsx
// src/renderer/components/Editor/WordCount.tsx
import React from 'react'
import { useVaultStore } from '../../store/vault-store'

export const WordCount: React.FC = () => {
  const wordCount = useVaultStore((s) => s.wordCount)

  return (
    <div className="word-count-bar">
      <span>Words: {wordCount.words.toLocaleString()}</span>
      <span className="word-count-separator">|</span>
      <span>Characters: {wordCount.characters.toLocaleString()}</span>
    </div>
  )
}
```

**Line-by-line explanation:**

- `import { useVaultStore } from '../../store/vault-store'` — imports the Zustand store hook. The path `../../store/vault-store` means "go up two directories from the current file's location (`Editor/`), then into `store/vault-store`".
- `useVaultStore((s) => s.wordCount)` — subscribes to the `wordCount` slice of state. The component will re-render whenever `wordCount` changes, but NOT when other parts of the store change. This is efficient selector usage.
- `toLocaleString()` — formats numbers with commas (1000 → "1,000")
- The JSX returns a simple `div` with two `span` elements.

### Step 5: Wire into MarkdownEditor.tsx

Open `src/renderer/components/Editor/MarkdownEditor.tsx`.

**5a. Import the WordCount component and the store:**

At the top, add `WordCount` to imports (the store is already imported):

```typescript
// src/renderer/components/Editor/MarkdownEditor.tsx
// Add this import near the top, after the other component imports:
import { WordCount } from './WordCount'
```

The `useVaultStore` import is already present. Now we need to get the `setWordCount` action:

```typescript
// Find this existing line:
const vaultPath = useVaultStore((s) => s.vaultPath)
const noteNames = useVaultStore((s) => s.noteNames)

// Add after it:
const setWordCount = useVaultStore((s) => s.setWordCount)
```

**5b. Update the word count when content changes:**

Inside the `useEffect` that sets up the `updateListener`, we need to also update the word count. Find the `updateListener` definition:

```typescript
// Find this existing code:
const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const newContent = update.state.doc.toString()
    onContentChange(newContent)
  }
})
```

Replace it with:

```typescript
const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const newContent = update.state.doc.toString()
    onContentChange(newContent)

    // Update word count whenever content changes
    window.api.getWordCount(newContent).then((count) => {
      setWordCount(count)
    })
  }
})
```

**5c. Also compute initial word count when a file first opens:**

Add a new `useEffect` after the existing content-update effect (at the bottom of the component, before the return statement):

```typescript
// src/renderer/components/Editor/MarkdownEditor.tsx
// Add this useEffect after the existing content/filePath effect:

  useEffect(() => {
    // Compute word count whenever the file changes or content is first loaded
    if (!content) {
      setWordCount({ words: 0, characters: 0 })
      return
    }
    window.api.getWordCount(content).then((count) => {
      setWordCount(count)
    })
  }, [filePath])  // re-run when the file path changes (i.e., user opened a different note)
```

**5d. Render the WordCount component:**

Find the `return` statement at the bottom of `MarkdownEditor`:

```tsx
// Find this existing return:
return <div ref={containerRef} className="editor-container" />
```

Replace it with:

```tsx
return (
  <div className="editor-wrapper">
    <div ref={containerRef} className="editor-container" />
    <WordCount />
  </div>
)
```

We wrap in `editor-wrapper` so we can stack the editor and status bar vertically.

### Step 6: Add CSS Styling

Open `src/renderer/styles/global.css`. Add these rules at the end of the file:

```css
/* Word count status bar */
.editor-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.word-count-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--fg-dim);
  flex-shrink: 0;
  user-select: none;
}

.word-count-separator {
  color: var(--border);
}
```

Also, find the existing `.editor-container` rule and update it — previously it had `flex: 1`, now the wrapper has that:

```css
/* Find this: */
.editor-container {
  flex: 1;
  overflow: hidden;
}

/* It should still have overflow: hidden and take available space.
   With the wrapper in place, it is still correct as-is. */
```

The `flex-shrink: 0` on `.word-count-bar` prevents it from shrinking when the editor is small. The `flex: 1` on `.editor-container` makes the editor fill all remaining space above the status bar.

### Step 7: Test

Run `npm run dev`. Open a note. You should see "Words: X | Characters: Y" at the bottom of the editor. Type some text and watch the count update in real time.

**If it does not work, debugging checklist:**
1. Open DevTools in the renderer: press `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS)
2. Check the Console tab for errors
3. If you see "window.api.getWordCount is not a function", you may have forgotten to save `preload/index.ts` or the build has not updated yet. Stop and restart `npm run dev`.
4. If you see TypeScript errors in your terminal, read them carefully — they tell you exactly what is wrong and where.

---

## 8. Adding a New CodeMirror Extension

CodeMirror 6 (CM6) uses a highly modular extension system. Every feature — syntax highlighting, line numbers, key bindings, autocomplete — is an extension. Understanding the pattern lets you add your own.

### The Extension Pattern

All CodeMirror extensions in this project live in `src/renderer/components/Editor/cm-*.ts` files. They are plain TypeScript files that export CM6 extension objects. They are imported in `MarkdownEditor.tsx` and added to the `extensions` array when the `EditorState` is created.

### Example: Reading the Existing wikiLinkPlugin

Read `src/renderer/components/Editor/cm-wiki-link.ts` to understand the pattern:

```typescript
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

// Define what the decoration looks like (CSS class applied to the text)
const wikiLinkMark = Decoration.mark({ class: 'cm-wiki-link' })

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

// Function that scans visible text and builds a set of decorations
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  // Only scan visible ranges (virtualization — efficient for large docs)
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null
    WIKI_LINK_RE.lastIndex = 0
    while ((match = WIKI_LINK_RE.exec(text)) !== null) {
      const start = from + match.index
      const end = start + match[0].length
      builder.add(start, end, wikiLinkMark)  // mark this range
    }
  }
  return builder.finish()
}

// ViewPlugin: a class-based extension that keeps state
export const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      // Build initial decorations when the plugin is created
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate): void {
      // Rebuild decorations when the document or viewport changes
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    // Tell CodeMirror where to find the DecorationSet on this plugin instance
    decorations: (v) => v.decorations
  }
)
```

### Tutorial: Adding a "Highlight Current Word" Extension

We will write an extension that highlights all occurrences of whichever word the cursor is currently inside.

Create `src/renderer/components/Editor/cm-highlight-word.ts`:

```typescript
import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

// CSS class applied to each matching word
const wordHighlight = Decoration.mark({ class: 'cm-current-word' })

function getWordAtCursor(view: EditorView): string | null {
  const { head } = view.state.selection.main  // cursor position (character offset)
  const docText = view.state.doc.toString()

  // Find word boundaries around the cursor
  // Walk backward to find start of word
  let start = head
  while (start > 0 && /\w/.test(docText[start - 1])) {
    start--
  }

  // Walk forward to find end of word
  let end = head
  while (end < docText.length && /\w/.test(docText[end])) {
    end++
  }

  // If start == end, cursor is not inside a word
  if (start === end) return null

  const word = docText.slice(start, end)
  // Only highlight if word is at least 3 characters (avoid highlighting "a", "I", etc.)
  if (word.length < 3) return null

  return word
}

function buildWordHighlights(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const word = getWordAtCursor(view)
  if (!word) return builder.finish()

  // Escape the word for use in a RegExp
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}\\b`, 'g')

  // Search through visible ranges only (efficient for large documents)
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      const matchFrom = from + match.index
      const matchTo = matchFrom + match[0].length
      // Don't highlight the word the cursor is actually inside
      const { head } = view.state.selection.main
      if (head >= matchFrom && head <= matchTo) continue
      builder.add(matchFrom, matchTo, wordHighlight)
    }
  }

  return builder.finish()
}

export const highlightCurrentWordPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildWordHighlights(view)
    }

    update(update: ViewUpdate): void {
      // Rebuild if document changed OR selection (cursor) moved
      if (update.docChanged || update.selectionSet) {
        this.decorations = buildWordHighlights(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)
```

Add the CSS for the highlight in `global.css`:

```css
.cm-current-word {
  background: rgba(137, 180, 250, 0.2);
  border-radius: 2px;
}
```

Wire it into `MarkdownEditor.tsx`:

```typescript
// In MarkdownEditor.tsx, import:
import { highlightCurrentWordPlugin } from './cm-highlight-word'

// In the extensions array inside EditorState.create:
const state = EditorState.create({
  doc: content,
  extensions: [
    lineNumbers(),
    // ... existing extensions ...
    highlightCurrentWordPlugin,   // <-- add here
    // ... remaining extensions ...
  ]
})
```

### CodeMirror Extension Types Reference

Here are the main extension types you will encounter:

**`ViewPlugin`** — Has mutable state, can hold decorations, re-runs on `update()`. Used for visual effects that depend on the current cursor/selection/viewport.

**`EditorView.updateListener`** — Runs a callback whenever the document or selection changes. Used in `MarkdownEditor` to call `onContentChange`.

**`EditorView.domEventHandlers`** — Intercepts DOM events (click, keydown, paste, drop). Used in `cm-smart-edit.ts` for paste handling and `cm-drop-handler.ts` for file drops.

**`keymap.of([...])` + `KeyBinding[]`** — Defines keyboard shortcuts. Each binding is `{ key: 'Mod-b', run: (view) => boolean }`. Return `true` to consume the event, `false` to pass it through.

**`autocompletion({ override: [...] })`** — Defines autocomplete sources. Each source is a function that receives a `CompletionContext` and returns `CompletionResult | null`. Used in `cm-autocomplete.ts` for `[[` wiki link completion.

**`StateField`** — Stores arbitrary state inside the editor state. Survives document changes. Not used in this project but important for complex features.

**`Decoration.mark({ class })`** — Applies a CSS class to a range of text without changing content.

**`Decoration.widget({ widget })`** — Inserts arbitrary DOM content at a position.

**`Decoration.line({ class })`** — Applies a CSS class to entire lines.

---

## 9. Key Libraries Deep Dive

### Zustand

#### What it is

Zustand (German for "state") is a minimal global state management library for React. If you have heard of Redux, Zustand solves the same problem with about 5% of the boilerplate.

#### The problem it solves

React components can only communicate in two ways: props (parent → child) and callbacks (child → parent). When two unrelated components need to share state — like the sidebar and the editor both needing `activeFile` — you have to "lift state up" to their common ancestor. In a complex app, this means passing data through many intermediate components ("prop drilling").

Zustand creates a store that lives outside the component tree. Any component can subscribe to it directly.

#### Comparison to Redux

| Redux | Zustand |
|---|---|
| Actions + Reducers + Selectors | Just a store with state + updater functions |
| Requires dispatch, action creators | Call setter functions directly |
| Immutable updates via spread | Zustand handles immutability |
| ~50 lines of boilerplate for one feature | ~5 lines |
| Good for very large teams | Good for small-to-medium projects |

#### The store pattern in this project

```typescript
// src/renderer/store/vault-store.ts
import { create } from 'zustand'

interface VaultState {
  // State declarations (like Java class fields):
  vaultPath: string | null
  activeFile: string | null
  activeContent: string
  showSearch: boolean

  // Action declarations (like Java methods):
  setVaultPath: (path: string | null) => void
  setActiveFile: (path: string | null) => void
  toggleSearch: () => void
}

export const useVaultStore = create<VaultState>((set) => ({
  // Initial state:
  vaultPath: null,
  activeFile: null,
  activeContent: '',
  showSearch: false,

  // Actions call set() to update state:
  setVaultPath: (path) => set({ vaultPath: path }),
  setActiveFile: (path) => set({ activeFile: path }),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),
  //                         ^--- function form: receives current state
}))
```

`set({ vaultPath: path })` merges the new object into the state (like `setState` in class components). It does a shallow merge — you only need to specify what changed.

`set((s) => ({ showSearch: !s.showSearch }))` — the function form of `set` receives the current state, useful when the new value depends on the old value.

**Using the store in components:**

```typescript
// Subscribe to the entire store (re-renders on ANY state change — avoid this)
const store = useVaultStore()

// Subscribe to a specific slice (re-renders only when that slice changes — preferred)
const vaultPath = useVaultStore((s) => s.vaultPath)
const toggleSearch = useVaultStore((s) => s.toggleSearch)

// Read state outside a component (useful in callbacks, event handlers):
const currentPath = useVaultStore.getState().activeFile
useVaultStore.getState().setActiveFile('/new/path')
```

In `App.tsx`, you will see `useVaultStore.getState().setActiveContent(content)` inside a callback — this is correct because you cannot call hooks inside non-hook callbacks.

---

### CodeMirror 6

#### Architecture

CodeMirror 6 (CM6) is a complete rewrite of CodeMirror with a functional, immutable state model. It is used as the text editor in this project.

CM6 has two core objects:

**`EditorState`** — Immutable snapshot of the editor at a point in time. Contains:
- The document text
- The current selection/cursor position
- All extension state
- Configuration

Every edit produces a NEW `EditorState` from the old one. You never mutate state directly — you create transactions.

**`EditorView`** — The live DOM-connected editor. Holds the current `EditorState` and is responsible for rendering. When you want to make a change, you `dispatch` a transaction to the view.

```typescript
// Creating the editor:
const state = EditorState.create({
  doc: "Initial content",
  extensions: [markdown(), lineNumbers(), history()]
})

const view = new EditorView({
  state,
  parent: document.getElementById('editor')  // DOM element to mount into
})

// Making a change (transaction):
view.dispatch({
  changes: {
    from: 5,    // character offset
    to: 10,     // character offset
    insert: "new text"
  }
})

// Reading the document:
const text = view.state.doc.toString()
const selection = view.state.selection.main  // { anchor, head, from, to }
```

#### Extensions

Everything in CM6 is an extension. The `extensions` array in `EditorState.create` is order-sensitive — later extensions can override earlier ones for things like keymaps.

```typescript
const state = EditorState.create({
  extensions: [
    lineNumbers(),          // gutter with line numbers
    history(),              // undo/redo
    markdown(),             // Markdown syntax mode
    keymap.of([
      ...defaultKeymap,     // standard editing keys (arrows, delete, etc.)
      ...historyKeymap,     // Ctrl+Z, Ctrl+Y
      { key: 'Mod-b', run: toggleBold }  // custom key
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) { ... }
    }),
    wikiLinkPlugin,
    smartEditExtensions
  ]
})
```

#### The UpdateListener Pattern

The `updateListener` is how CodeMirror communicates changes back to React:

```typescript
EditorView.updateListener.of((update: ViewUpdate) => {
  if (update.docChanged) {
    // update.state is the NEW EditorState after the change
    const newContent = update.state.doc.toString()
    onContentChange(newContent)   // call React callback
  }
})
```

`update.docChanged` is `true` only when the document text changed (not just cursor movement), so this does not fire unnecessarily.

---

### d3-force

#### What it is

D3 (Data-Driven Documents) is a visualization library. The `d3-force` module specifically implements physics-based force simulations — like a spring-mass system — used for the note graph view.

#### How it works

```typescript
// 1. Define nodes (the things being simulated)
const nodes: GraphNode[] = [
  { id: '/path/to/note1.md', name: 'Note 1', x: 0, y: 0 },
  { id: '/path/to/note2.md', name: 'Note 2', x: 0, y: 0 }
]

// 2. Define links (connections between nodes)
const links: GraphLink[] = [
  { source: '/path/to/note1.md', target: '/path/to/note2.md' }
]

// 3. Create the simulation
const simulation = d3Force.forceSimulation(nodes)
  .force('link',      d3Force.forceLink(links).id(d => d.id).distance(80))
  // ^ spring force: pulls linked nodes together
  .force('charge',    d3Force.forceManyBody().strength(-100))
  // ^ repulsion force: pushes all nodes apart (like magnets)
  .force('center',    d3Force.forceCenter(width / 2, height / 2))
  // ^ gravity: pulls everything toward the center
  .force('collision', d3Force.forceCollide().radius(20))
  // ^ prevents nodes from overlapping

// 4. On each simulation tick, update SVG element positions
simulation.on('tick', () => {
  linkElements
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y)

  nodeElements
    .attr('transform', d => `translate(${d.x},${d.y})`)
})
```

The simulation runs many ticks per second (like a game loop), updating node positions until the system reaches equilibrium (alpha drops to 0). Each tick, React does not re-render — D3 directly manipulates the SVG DOM.

This is why `GraphView.tsx` uses `useRef` for the SVG element (`svgRef`) and manages everything imperatively with D3, rather than using React state. The simulation runs too fast for React's reconciliation to keep up.

---

### MiniSearch

#### What it is

MiniSearch is a lightweight full-text search library that runs entirely in memory. It is used for the search panel (Ctrl+Shift+F).

#### How it works

```typescript
// 1. Create the search index (done in search-service.ts)
const miniSearch = new MiniSearch({
  fields: ['title', 'body'],     // fields to index and search
  storeFields: ['title', 'path'], // fields to return in results (not searched)
  searchOptions: {
    boost: { title: 2 },   // title matches count double
    prefix: true,          // "note" matches "notes", "notebook"
    fuzzy: 0.2             // 20% fuzzy — "sarch" matches "search"
  }
})

// 2. Add documents
miniSearch.addAll([
  { id: '/path/note1.md', title: 'My Note', path: '/path/note1.md', body: '...' },
  { id: '/path/note2.md', title: 'Recipes', path: '/path/note2.md', body: '...' }
])

// 3. Search
const results = miniSearch.search('my note')
// Returns: [{ id, title, path, score, match, ... }]

// 4. Keep index up to date
miniSearch.discard('/path/note1.md')  // remove from index
miniSearch.add({ id: '...', title: '...', body: '...' })  // re-add updated version
```

The index is rebuilt when the vault is opened and incrementally updated when files change (via the file watcher or IPC calls).

---

### chokidar

#### What it is

chokidar is a file system watching library. It wraps the native OS file watching APIs (inotify on Linux, kqueue on macOS, ReadDirectoryChangesW on Windows) with a consistent cross-platform interface.

#### How it is used

```typescript
// src/main/watcher-service.ts
import chokidar from 'chokidar'

this.watcher = chokidar.watch(vaultPath, {
  ignored: /(^|[/\\])\./,   // ignore hidden files/folders (starting with .)
  persistent: true,          // keep the process alive while watching
  ignoreInitial: true,       // don't fire events for files that exist at startup
  awaitWriteFinish: {        // wait for file writes to finish before firing
    stabilityThreshold: 100, // wait 100ms after last write event
    pollInterval: 50
  }
})

this.watcher
  .on('change', (filePath) => { /* file content changed */ })
  .on('add',    (filePath) => { /* new file created */ })
  .on('unlink', (filePath) => { /* file deleted */ })
  .on('addDir', (dirPath)  => { /* new directory */ })
  .on('unlinkDir', (dirPath) => { /* directory deleted */ })
```

When chokidar detects a change, the `WatcherService` debounces the event (waits 100ms in case multiple rapid events fire) and sends an IPC message to the renderer:

```typescript
mainWindow.webContents.send('vault:file-changed', filePath)
```

The renderer's `useVault.ts` hook listens for this and reloads the affected file if it is currently open.

---

## 10. Common Development Tasks

### Adding a New IPC Endpoint

This is the most common task when adding backend functionality. There are exactly 3 places to edit.

**1. Add the handler in `src/main/ipc-handlers.ts`:**

```typescript
// Inside registerIpcHandlers()
ipcMain.handle('myfeature:doSomething', async (_event, arg1: string, arg2: number) => {
  // ... do work using Node.js APIs ...
  return { result: 'ok', value: 42 }
})
```

**2. Add the method to the api object in `src/preload/index.ts`:**

```typescript
// Inside the api object
doSomething: (arg1: string, arg2: number): Promise<{ result: string; value: number }> =>
  ipcRenderer.invoke('myfeature:doSomething', arg1, arg2),
```

**3. Call it from any renderer component:**

```typescript
const result = await window.api.doSomething('hello', 42)
console.log(result.value)  // 42
```

The TypeScript type flows end-to-end: if you define the return type in the preload, every component that calls it will get type checking and autocomplete.

---

### Adding a New React Component

1. Create the file: `src/renderer/components/MyComponent.tsx`

```tsx
import React from 'react'

interface MyComponentProps {
  title: string
  onClose: () => void
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onClose }) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={onClose}>Close</button>
    </div>
  )
}
```

2. Import and use it in the parent component:

```tsx
// In App.tsx or wherever:
import { MyComponent } from './components/MyComponent'

// In the JSX:
{showMyComponent && (
  <MyComponent
    title="My Feature"
    onClose={() => setShowMyComponent(false)}
  />
)}
```

3. Add CSS to `src/renderer/styles/global.css`:

```css
.my-component {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius);
}
```

**Rules for new components:**
- One component per file
- File name matches component name (PascalCase)
- Define a `Props` interface for all props
- Use the `React.FC<Props>` type annotation
- Export as a named export (not default) so it is easier to find and rename

---

### Modifying the Zustand Store

To add new state:

**Step 1:** Add the type to the interface:
```typescript
interface VaultState {
  myNewValue: string        // add state field
  setMyNewValue: (v: string) => void  // add action
}
```

**Step 2:** Add initial value and implementation to `create(...)`:
```typescript
export const useVaultStore = create<VaultState>((set) => ({
  myNewValue: '',           // initial value
  setMyNewValue: (v) => set({ myNewValue: v }),  // action
}))
```

**Step 3:** Use in any component:
```typescript
const myNewValue = useVaultStore((s) => s.myNewValue)
const setMyNewValue = useVaultStore((s) => s.setMyNewValue)
```

---

### Adding Keyboard Shortcuts

Keyboard shortcuts are registered in `App.tsx` in the `useEffect` that sets up the `keydown` listener:

```typescript
// src/renderer/App.tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Shift+F = search
      if (e.shiftKey && e.key === 'F') {
        e.preventDefault()
        toggleSearch()
      }
      // Ctrl+D = open today's daily note
      else if (!e.shiftKey && e.key === 'd') {
        e.preventDefault()
        openDailyNote()
      }
      // Add your new shortcut here:
      else if (e.key === 'h') {           // Ctrl+H
        e.preventDefault()
        doYourThing()
      }
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [/* dependencies */])
```

> **Note:** Ctrl+D (and other Chromium-reserved shortcuts such as Ctrl+N, Ctrl+O, Ctrl+G, Ctrl+W) are intercepted in `src/main/index.ts` via `webContents.on('before-input-event')` before Chromium can consume them. They are forwarded to the renderer as `shortcut` IPC push events, which `App.tsx` receives via `window.api.onShortcut(...)` and dispatches to the appropriate handler.

For editor-specific shortcuts (only active when the editor is focused), add them to `cm-smart-edit.ts`:

```typescript
// In smartEditKeymap array:
{
  key: 'Mod-Shift-h',     // Mod = Ctrl on Windows/Linux, Cmd on macOS
  run: (view: EditorView): boolean => {
    // return true to consume the event, false to pass through
    doEditorThing(view)
    return true
  }
}
```

**Key name reference:**
- `Mod` = Ctrl on Windows/Linux, Cmd on macOS
- `Alt` = Alt/Option
- `Shift` = Shift
- `Enter`, `Tab`, `Escape`, `ArrowUp`, etc. — use exact names
- Letter keys: just the letter `a`, `b`, `c` etc.

---

### Resizable Panels

The app layout is a 3-column CSS grid (left sidebar | center editor | right panel). Each column boundary has a `<div class="resize-handle">` element. When the user drags a resize handle, a `mousemove` listener in `App.tsx` adjusts the corresponding CSS grid column width by updating an inline style or a CSS variable.

To change the minimum or maximum panel sizes, edit the clamp values in the `onMouseMove` handler inside `App.tsx`:

```typescript
// In App.tsx resize handler:
const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX))
document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
```

The corresponding CSS grid uses the variable:

```css
/* global.css */
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 240px) 1fr var(--right-panel-width, 280px);
}
```

If you want to add a new resizable boundary (e.g. between two right-panel tabs), follow the same pattern: add a `resize-handle` div, attach `onMouseDown` to start tracking, and update a CSS variable on `mousemove`.

---

### Changing the Theme/CSS

All colors and fonts are defined as CSS custom properties (variables) in the `:root` block at the top of `src/renderer/styles/global.css`:

```css
:root {
  --bg: #1e1e2e;            /* main background */
  --bg-secondary: #181825;  /* sidebar, panels */
  --fg: #cdd6f4;            /* main text color */
  --accent: #89b4fa;        /* links, active items, buttons */
  --border: #313244;        /* dividers */
  /* ... more variables ... */
}
```

To change the color scheme, only edit these variables. Every component uses them, so changing `--accent: #89b4fa` to `--accent: #ff6b6b` turns all accent elements red throughout the entire app.

The current theme is based on Catppuccin Mocha (a popular dark color scheme). To add a light theme:

```css
/* In global.css, add: */
@media (prefers-color-scheme: light) {
  :root {
    --bg: #eff1f5;
    --bg-secondary: #e6e9ef;
    --fg: #4c4f69;
    --accent: #1e66f5;
    --border: #ccd0da;
    /* ... override all variables ... */
  }
}
```

---

### Debugging

#### Debugging the Renderer Process

The renderer is just a web page. Use Chrome DevTools:

1. In development mode, press `Ctrl+Shift+I` (or `Cmd+Option+I`) to open DevTools
2. Or go to View menu → Toggle Developer Tools (if menu bar is visible)

In DevTools:
- **Console tab** — All `console.log()`, errors, and warnings from renderer code
- **Sources tab** — Step through renderer code, set breakpoints (TypeScript source maps work)
- **Network tab** — See IPC calls (not really, but useful for understanding what loads)
- **Elements tab** — Inspect the DOM, live-edit CSS

**Setting a breakpoint:**
1. Open Sources tab
2. Find your file (e.g., `App.tsx` under `src/renderer/`)
3. Click a line number to set a breakpoint
4. Trigger the code — execution pauses

**Logging:**
```typescript
console.log('Value:', someVariable)
console.error('Something went wrong:', error)
console.table(arrayOfObjects)
```

#### Debugging the Main Process

The main process is Node.js, not a browser. Its logs appear in the terminal where you ran `npm run dev`.

To set breakpoints in the main process:

1. Modify the dev script in `package.json` to include the Node.js debugger flag:
   ```json
   "dev": "electron-vite dev --inspect"
   ```
2. Open Chrome browser (not your app) and go to `chrome://inspect`
3. Under "Remote Target" you should see the Electron main process
4. Click "inspect" to open DevTools for Node.js

Alternatively, add `debugger` statements to your code:
```typescript
function createWindow(): void {
  debugger   // execution pauses here when inspector is attached
  const config = loadConfig()
  // ...
}
```

**Common main process log patterns:**
```typescript
// In ipc-handlers.ts or file-service.ts
console.log('[FileService] openVault:', dirPath)
console.error('[LinkIndex] Failed to parse:', filePath, error)
```

---

## 11. Build and Packaging

### Development Build

```
npm run dev
```

Starts the development server with hot reload. This is what you use during development. The output goes to `out/` but Vite serves the renderer from memory.

### Production Build (Compilation Only)

```
npm run build
```

This runs `electron-vite build`, which:
1. Compiles TypeScript for all three targets (main, preload, renderer)
2. Bundles all JavaScript/TypeScript into optimized files
3. Outputs to `out/main/`, `out/preload/`, `out/renderer/`
4. Minifies the renderer bundle for smaller file size

The `out/` folder now contains everything needed to run the app — but it is still unpackaged (just compiled JavaScript, no Electron binary).

To preview the production build without packaging:
```
npm run start
```

This runs `electron-vite preview`, which uses the `out/` folder instead of the dev server.

### Platform-Specific Packaging

electron-builder takes the `out/` folder and packages it into a platform-native installer.

**Package for Windows (.exe installer):**
```
npm run build:win
```

This runs `electron-vite build && electron-builder --win`. It:
1. Builds the app
2. Downloads the Electron binary for Windows (if not cached)
3. Creates a NSIS installer in the `dist/` folder

**Package for macOS (.dmg):**
```
npm run build:mac
```

Note: You must be on a macOS machine to build for macOS (because it requires macOS-specific tools for code signing).

**Package for Linux (.AppImage):**
```
npm run build:linux
```

**Build for all platforms (only works on macOS with cross-compilation tools):**
```
npm run build:unpack
```

This builds the app but does not create an installer — just a directory with all the files. Useful for testing without installing.

### How electron-builder Works

electron-builder reads the `"build"` section of `package.json`:

```json
"build": {
  "appId": "com.nexusnotes.app",          // unique app identifier
  "productName": "Nexus Notes",            // display name
  "directories": {
    "buildResources": "resources"          // folder for app icons
  },
  "files": [
    "out/**/*"                             // what files to include in the package
  ],
  "win": { "target": "nsis" },            // Windows: NSIS installer
  "mac": { "target": "dmg" },             // macOS: disk image
  "linux": { "target": "AppImage" }       // Linux: portable AppImage
}
```

electron-builder:
1. Creates a temporary directory with the specified `files` (`out/**/*`)
2. Copies the Electron binary
3. Runs asar packaging (bundles app files into a single binary archive)
4. Creates the platform-specific installer (NSIS, DMG, AppImage)
5. Outputs to `dist/`

### App Icons

Place your app icons in the `resources/` directory:
- `icon.ico` — Windows icon (256x256 recommended)
- `icon.icns` — macOS icon
- `icon.png` — Linux icon (512x512 recommended)

electron-builder automatically picks these up.

---

## 12. Troubleshooting

### "node_modules not found" or "Cannot find module"

**Cause:** You have not run `npm install`, or `node_modules` was deleted.

**Fix:**
```
npm install
```

If the problem persists:
```
rm -rf node_modules package-lock.json
npm install
```

---

### TypeScript errors in terminal

TypeScript errors stop the build and look like:
```
src/renderer/App.tsx:42:5 - error TS2345: Argument of type 'string | null'
is not assignable to parameter of type 'string'.
```

Read the error carefully. It tells you the file, line number, and what is wrong. TypeScript errors are almost always correct — the type system has caught a real bug.

Common fixes:
- **`Type 'X | null' is not assignable to type 'X'`** — You need to handle the null case:
  ```typescript
  if (activeFile) {
    openNote(activeFile)  // TypeScript now knows activeFile is a string
  }
  ```
- **`Property 'X' does not exist on type 'Y'`** — You are accessing a property that does not exist on that type. Check spelling or update the interface.
- **`Cannot find module './MyComponent'`** — The import path is wrong or the file does not exist.

---

### The window opens but shows a blank white screen

**Cause:** Usually a JavaScript error in the renderer crashing before anything renders.

**Fix:**
1. Open DevTools (Ctrl+Shift+I)
2. Check the Console tab for red error messages
3. Read the error and its stack trace — it tells you exactly which file and line failed

---

### IPC call hangs forever / Promise never resolves

**Cause:** The main process handler crashed, threw an unhandled error, or the handler name is misspelled.

**Fix:**
1. Check the terminal for main process errors
2. Verify the channel name is identical in `ipcMain.handle('channel:name', ...)` and `ipcRenderer.invoke('channel:name', ...)`
3. Add a try/catch to the handler:
   ```typescript
   ipcMain.handle('fs:readNote', async (_e, filePath: string) => {
     try {
       return fs.readFileSync(filePath, 'utf-8')
     } catch (error) {
       console.error('[IPC] fs:readNote failed:', error)
       throw error  // re-throw so the renderer's Promise rejects
     }
   })
   ```

---

### "window.api is undefined"

**Cause:** The preload script did not run, or `contextBridge.exposeInMainWorld` was not called.

**Fix:**
1. Check that `webPreferences.preload` in `createWindow()` points to the correct path
2. Check the main process terminal for errors during app startup
3. Verify `src/preload/index.ts` calls `contextBridge.exposeInMainWorld('api', api)` at the top level (not inside a function)

---

### React component not updating when store changes

**Cause:** You are subscribed to the whole store instead of the specific slice, or you mutated state directly.

**Fix:**

Make sure you are using the selector form:
```typescript
// Correct — only re-renders when activeFile changes:
const activeFile = useVaultStore((s) => s.activeFile)

// Problematic — re-renders on ANY store change:
const { activeFile } = useVaultStore()
```

Make sure you are calling the setter, not mutating:
```typescript
// WRONG — React/Zustand cannot detect this mutation:
store.activeFile = '/new/path'

// CORRECT — triggers re-renders in subscribed components:
store.setActiveFile('/new/path')
```

---

### Hot reload not working / changes not reflected

**Fix:**
1. Save the file (Ctrl+S) — some editors only write on explicit save
2. If it still does not update, check the Vite output in the terminal for compile errors
3. For main process changes: the whole window reloads (slower). Wait a moment.
4. As a last resort: stop `npm run dev` with Ctrl+C and restart it

---

### Where to Find Logs

| Log type | Location |
|---|---|
| Renderer JS errors | DevTools Console (Ctrl+Shift+I in the app window) |
| Main process logs | Terminal where you ran `npm run dev` |
| electron-vite build errors | Terminal where you ran `npm run build` |
| TypeScript errors | Terminal (during dev or build) |
| App config | `~/.nexusnotes/config.json` (home directory) |

**On Windows**, the home directory is `C:\Users\YourName\`. So the config is at `C:\Users\YourName\.nexusnotes\config.json`. You can delete this file to reset the saved vault path.

---

### Useful Commands for Debugging

```
# Check TypeScript for errors without building:
npx tsc --noEmit

# Run ESLint to check code style:
npm run lint

# Format all code with Prettier:
npm run format

# Clear compiled output and rebuild:
rm -rf out && npm run build

# Check which version of Node.js is running:
node --version

# Check which version of a specific package is installed:
npm list zustand
```

---

## Further Reading

Once you are comfortable with this codebase, these resources will take you deeper:

- **TypeScript Handbook** — https://www.typescriptlang.org/docs/handbook/intro.html — The official TS reference. Read the first 10 chapters.
- **React docs (beta)** — https://react.dev/ — The new React documentation is excellent. Start with "Learn React".
- **Electron documentation** — https://www.electronjs.org/docs/latest — Especially the "Process Model" and "IPC" sections.
- **CodeMirror 6 reference** — https://codemirror.net/docs/ — The "System Guide" explains the architecture in depth.
- **Zustand README** — https://github.com/pmndrs/zustand — Short and complete.
- **electron-vite docs** — https://electron-vite.org/ — Covers the build configuration in depth.
- **MDN Web Docs** — https://developer.mozilla.org/ — The definitive reference for HTML, CSS, and browser JavaScript APIs.
