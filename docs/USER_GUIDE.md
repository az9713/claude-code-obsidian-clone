# Nexus Notes - User Guide

Welcome to Nexus Notes. This guide will walk you through everything you need to know to get the most out of the app, whether you are picking it up for the first time or looking to deepen your understanding of a specific feature.

---

## Table of Contents

1. [Welcome to Nexus Notes](#1-welcome-to-nexus-notes)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Eleven Educational Use Cases](#3-eleven-educational-use-cases)
4. [Complete Feature Reference](#4-complete-feature-reference)
5. [Keyboard Shortcuts Reference](#5-keyboard-shortcuts-reference)
6. [Tips and Tricks](#6-tips-and-tricks)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Welcome to Nexus Notes

### What is Nexus Notes?

Nexus Notes is a local, private note-taking application built for people who think in connections. Unlike traditional note apps where notes sit in isolation, Nexus Notes is designed around the idea that knowledge is a network. Every note can link to other notes, and the app helps you discover and visualize those relationships over time.

Your notes are stored as plain Markdown files on your own computer. There is no cloud account required, no subscription, and no lock-in. If you ever want to open your notes in another editor, they are just `.md` files in a folder.

### Who is Nexus Notes For?

Nexus Notes is a good fit for:

- **Students** building a personal knowledge base across subjects
- **Researchers** who need to connect ideas across many sources
- **Writers** who want to develop ideas and see how themes relate
- **Professionals** who maintain project notes, meeting records, and reference material
- **Anyone** who has tried to remember something they wrote down months ago and wants a better way

You do not need any technical background to use Nexus Notes. If you can type and use a web browser, you can use this app.

### Key Concepts

Before diving in, a handful of terms are used throughout this guide. Here is what they mean:

**Vault**
A vault is simply a folder on your computer that Nexus Notes uses to store all your notes. When you open Nexus Notes for the first time, you choose (or create) a folder to be your vault. Everything inside that folder is your vault. You can have notes organized into sub-folders within the vault.

Nexus Notes recognizes the following folder conventions inside your vault:

| Folder | Purpose |
|---|---|
| `Notes/` | Regular notes and general writing |
| `Daily/` | Daily notes created by Ctrl+D (named YYYY-MM-DD.md) |
| `Sources/` | Transcripts, summaries, and extracted content from external material |
| `Attachments/` | Images, PDFs, and other non-Markdown files |
| `Templates/` | Note templates you can copy as starting points |

These folders are not mandatory — Nexus Notes will work with any folder structure — but following this convention keeps your vault predictable as it grows.

**Notes**
Notes are individual Markdown files (`.md`) inside your vault. Each note is one document you can write in, link from, and search for. The filename becomes the note's title.

**Wiki-Links**
A wiki-link is a special way of linking one note to another by wrapping the target note's name in double square brackets, like `[[Meeting Notes]]`. Ctrl+clicking a wiki-link opens the linked note. If the note does not exist yet, Ctrl+clicking the link creates it automatically.

**Backlinks**
When note A contains a link to note B, note B has a backlink pointing back to note A. The Backlinks panel shows you every note that links to the one you are currently reading, giving you a way to navigate backwards through your network of ideas.

**Graph**
The Graph view is a visual map of your entire vault. Each note appears as a dot (node), and every wiki-link between two notes appears as a line (edge) connecting them. The graph lets you see the shape of your knowledge at a glance.

---

## 2. Quick Start Guide

This section gets you from zero to writing your first note in under five minutes.

### Step 1: Launch the App

Open Nexus Notes from your applications. You will see a welcome screen with a single button labeled "Open Vault".

### Step 2: Select or Create a Vault Folder

Click "Open Vault". A folder picker will appear. You have two options:

- **Use an existing folder**: Navigate to a folder you already have on your computer, such as `Documents/My Notes`, and select it.
- **Create a new folder**: In the folder picker dialog, create a new folder first (most operating systems let you do this inside the dialog), then select it.

After selecting a folder, Nexus Notes will load it as your vault. The left sidebar will appear, showing the Explorer panel. Your vault is now open.

> Nexus Notes remembers your vault between sessions. The next time you launch the app, it will open your vault automatically without asking again.

### Step 3: Create Your First Note

At the top of the left sidebar, look for a "+" button next to the word "Explorer". Click it. A prompt will appear asking for a note name. Type a name, such as "My First Note", and press Enter. The note will be created and opened immediately in the editor.

You can also press **Ctrl+N** anywhere in the app to create a new note.

### Step 4: Write Some Markdown

The editor uses Markdown, a lightweight formatting language. You can write plain text, and it will look exactly as you typed it. When you want formatting, you add simple characters around your text:

```
# This is a heading

This is a paragraph. **This text is bold.** *This is italic.*

- This is a bullet point
- Another bullet point

1. Numbered item
2. Another numbered item
```

You do not need to memorize Markdown right away. The toolbar at the top of the editor has buttons for the most common formatting options, and the [Complete Feature Reference](#4-complete-feature-reference) section covers all the syntax.

### Step 5: Save - Auto-Save Explained

You do not need to press anything to save. Nexus Notes saves your note automatically, approximately 300 milliseconds after you stop typing. You will never lose work by forgetting to save.

There is no "save" button and no "unsaved changes" indicator to worry about. Just write, and the file is kept up to date in the background.

---

## 3. Eleven Educational Use Cases

Each use case below is a hands-on exercise. Work through them in order for the best experience, as some build on notes created in earlier exercises.

---

### Use Case 1: Creating Your First Note

**Goal**: Create a note, write in it, and observe how the sidebar and auto-save work.

**Steps**:

1. Make sure a vault is open (see the Quick Start section above if not).
2. Look at the top of the left sidebar. You will see two buttons: a "+" button and a refresh button.
3. Click the "+" button.
4. When prompted, type `My First Note` and press Enter.
5. The note opens in the center editor area. You will also see it appear in the sidebar on the left.
6. Type a few sentences in the editor.

**What to observe**:

- The note appears in the sidebar the moment it is created, with a file icon next to the name.
- The currently open note is highlighted in the sidebar with a blue tint.
- As you type, the file is saved automatically. There is no need to press Ctrl+S.
- The editor displays line numbers in the left margin.

---

### Use Case 2: Formatting with Markdown

**Goal**: Practice using headings, bold, italic, inline code, and the toolbar.

**Steps**:

1. Open `My First Note` if it is not already open.
2. Place your cursor at the top of the note and type:
   ```
   # My Heading
   ## A Subheading
   ### A Smaller Subheading
   ```
3. On the next line, type some normal text, then try making part of it bold using the keyboard shortcut **Ctrl+B**. Select a word first, then press Ctrl+B. The selected text will be wrapped in `**asterisks**`.
4. Try **Ctrl+I** to make text italic. Selected text becomes `*italicized*`.
5. Try the toolbar buttons at the top of the editor instead:
   - The bold **B** button applies bold formatting
   - The italic *I* button applies italic formatting
   - The `<>` button wraps text in backticks for inline code
   - The **H1**, **H2**, **H3** buttons insert heading markers

**Markdown syntax summary for this use case**:

| What you type | What it means |
|---|---|
| `# Heading` | Top-level heading |
| `## Heading` | Second-level heading |
| `### Heading` | Third-level heading |
| `**text**` | Bold text |
| `*text*` | Italic text |
| `` `text` `` | Inline code |

**What to observe**:

- If you select existing text before pressing a formatting shortcut, the selection is wrapped. If nothing is selected, placeholder text like `**bold**` is inserted with the cursor positioned inside for you to type.
- Pressing Ctrl+B a second time on already-bolded text will remove the bold markers (it toggles).

---

### Use Case 3: Creating a Bullet List and Task List

**Goal**: Use smart list editing to write bullet points, numbered lists, and checkboxes.

**Steps**:

1. In any note, type `- ` (a dash followed by a space) and then write a list item, such as `Buy groceries`.
2. Press **Enter**. The next line automatically starts with `- ` so you can continue your list without typing the dash again.
3. Add a few more items. Then press **Enter** on the last item, then press **Enter** again on the empty bullet. The empty bullet line is removed and the list ends cleanly.
4. To create a nested sub-list, position your cursor on a bullet line and press **Tab**. The line indents by two spaces, making it a child item. Press **Shift+Tab** to outdent it back.
5. Now try a task list. Type `- [ ] ` (dash, space, open bracket, space, close bracket, space) followed by a task name, such as `Send the report`.
6. Press **Enter** to continue adding tasks on new lines.
7. To check off a task, place your cursor on the task line and press **Ctrl+Enter**. The `[ ]` changes to `[x]`, marking it done. Press Ctrl+Enter again to uncheck it.

**What to observe**:

- The Enter key is context-aware: it continues lists intelligently rather than just adding a blank line.
- An empty list item removes itself when you press Enter, which is the natural way to exit a list.
- Numbered lists auto-increment. If your list has items 1, 2, 3 and you press Enter after item 2, the new item becomes 3 and the old item 3 becomes 4 automatically.

---

### Use Case 4: Linking Notes Together with Wiki-Links

**Goal**: Create multiple notes and connect them using wiki-links.

**Steps**:

1. Create a note called `Projects` (click "+" and type the name).
2. Create a note called `Meeting Notes`.
3. Create a note called `Ideas`.
4. Open the `Projects` note by clicking it in the sidebar.
5. In the editor, type the following:

   ```
   # Projects

   I track all project activity in [[Meeting Notes]].
   New feature ideas live in [[Ideas]].
   ```

6. Notice that `[[Meeting Notes]]` and `[[Ideas]]` appear highlighted in blue with a dotted underline. These are your wiki-links.
7. Ctrl+Click on `[[Meeting Notes]]`. You will be taken directly to that note.
8. Now go back to `Projects` and try typing `[[` anywhere. A live autocomplete list will appear showing all notes in your vault. Use the arrow keys to select a note and press Enter to complete the link.

**What to observe**:

- Wiki-links are styled in blue to stand out from regular text.
- Hovering over a wiki-link changes its underline from dotted to solid, giving a clear visual cue that it is Ctrl+clickable.
- The autocomplete appears the moment you type `[[`, making it easy to link notes without remembering exact names.

---

### Use Case 5: Discovering Backlinks

**Goal**: Use the Backlinks panel to trace which notes link to your current note.

**Steps**:

1. This use case builds on Use Case 4. Make sure you have the `Projects`, `Meeting Notes`, and `Ideas` notes from the previous exercise.
2. Click on `Meeting Notes` in the sidebar to open it.
3. Look at the right side panel. At the top you will see two tabs: "Links" and "Graph". The "Links" tab should be active by default.
4. In the Backlinks panel, you will see `Projects` listed as a note that links to `Meeting Notes`.
5. Below the note name, you will see a small preview of the context - the actual line of text in `Projects` that contains the link.
6. Click on `Projects` in the backlinks panel. You will navigate directly to the `Projects` note.

**What to observe**:

- Backlinks update automatically as you add and remove links in your notes.
- When a note has no backlinks, the panel shows "No backlinks". This is useful for identifying "orphan" notes that are not connected to anything yet.
- The context snippet below each backlink shows where in the source note the link appears, helping you remember why the connection was made.

---

### Use Case 6: Creating a Note from a Link

**Goal**: Write a link to a note that does not exist yet and let Nexus Notes create it automatically.

**Steps**:

1. Open any existing note, such as `Ideas`.
2. Type the following text:

   ```
   I should explore [[Quantum Computing]] further.
   ```

3. Notice that `[[Quantum Computing]]` appears as a blue wiki-link even though no such note exists.
4. Ctrl+Click on `[[Quantum Computing]]`.
5. Nexus Notes will create a new, empty note called `Quantum Computing` and open it immediately.
6. Start writing content in the new note.

**What to observe**:

- You never have to create a note before linking to it. Write the link first, fill in the content later. This matches how ideas naturally emerge.
- After the new note is created, if you go back to `Ideas`, you will now find `Ideas` appears in the Backlinks panel of `Quantum Computing`.
- The new note also appears in the sidebar automatically.

---

### Use Case 7: Organizing with Folders

**Goal**: Create a folder in the sidebar, move notes into it, and use collapse/expand to manage the view.

**Steps**:

1. Right-click anywhere in the file tree area of the left sidebar (not on a specific file, but in empty space, or directly on an existing note or folder).
2. A context menu appears with options: "New Note", "New Folder", "Rename", and "Delete".
3. Click "New Folder". A prompt will ask for the folder name. Type `Reference` and press Enter.
4. The `Reference` folder appears in the sidebar with a folder icon.
5. To move a note into the folder, drag it from the sidebar and drop it onto the `Reference` folder. The folder will highlight with a dashed blue outline while you are dragging over it.
6. Click the folder name or the arrow icon next to it to collapse it, hiding its contents. Click again to expand.
7. You can also right-click on a folder to create a new note directly inside it.

**What to observe**:

- Folders give you a visual hierarchy without affecting how links work. A note inside a folder can still be linked from anywhere using its name in `[[double brackets]]`.
- You can also drag external files into the sidebar. Markdown (`.md`) files will be copied into your vault. Other file types (images, PDFs, etc.) will be copied into an `Attachments` folder inside your vault.
- Right-clicking on any note gives you options to rename or delete it as well.

---

### Use Case 8: Searching Your Notes

**Goal**: Use the search panel to find notes and navigate to content quickly.

**Steps**:

1. Press **Ctrl+Shift+F** to open the search panel. A dark overlay appears with a search input box in the center.
2. Start typing a word or phrase that appears in one of your notes. Results appear instantly as you type.
3. Each result shows the note title at the top, and up to two matching lines of text below it, with your search term highlighted in yellow.
4. Use the **arrow keys** (Up/Down) to move through the results list without using the mouse.
5. Press **Enter** to open the currently highlighted result. The search panel closes and the note opens.
6. Alternatively, click any result directly with the mouse.
7. To close the search panel without navigating anywhere, press **Escape** or click the dark background area outside the search dialog.

You can also press **Ctrl+O** as a quick open shortcut - it opens the same search panel.

**What to observe**:

- Search is case-insensitive, so searching for "quantum" will also match "Quantum".
- Matches are highlighted in a warm yellow color inside the result snippets.
- The search runs across the content of all your notes, not just their titles. This means you can find a note even if you only remember a phrase from inside it.
- Results appear within 200 milliseconds of you stopping typing.

---

### Use Case 9: Visualizing Your Knowledge Graph

**Goal**: Open the Graph view and explore how your notes connect visually.

**Steps**:

1. Make sure you have at least three or four notes with some wiki-links between them (the notes from Use Cases 4-6 work well here).
2. Look at the top-right of the right panel. You will see two tabs: "Links" and "Graph". Click "Graph".
   - Alternatively, press **Ctrl+G** to toggle the graph view on and off.
3. The graph renders as an animated force-directed diagram. Each note appears as a circular node. Lines between nodes represent wiki-links.
4. The currently open note appears as a larger, bright blue node. Notes directly linked to the current note appear in a lighter blue. All other notes appear in a muted grey.
5. Active links (connected to the current note) are drawn with brighter, more opaque lines. Other links appear faint.
6. **Click any node** to navigate to that note. The graph will update to highlight that note's connections.
7. **Drag any node** to reposition it. The simulation will respond to the repositioning and settle into a new layout.
8. **Scroll with the mouse wheel** to zoom in and out. This is useful when your vault grows large.

**What to observe**:

- The graph is a live view - as you open different notes, the highlighting updates to reflect your current note.
- Highly connected notes (those with many links) will naturally cluster toward the center of the graph because they have more forces pulling them.
- Isolated notes (those with no links) float near the edges. The graph is a useful way to spot notes that are "orphaned" and might benefit from being connected.

---

### Use Case 10: Smart Paste - Turning URLs into Links

**Goal**: Use the smart paste feature to convert a copied URL into a formatted Markdown link.

**Steps**:

1. Open any note in the editor.
2. Type some text that you want to become a clickable link, such as:
   ```
   Read more about this on the official documentation.
   ```
3. Use your mouse to **select the words** you want to use as the link text - for example, select "official documentation".
4. In your web browser, navigate to any page and copy its URL from the address bar (Ctrl+C in the browser).
5. Come back to Nexus Notes and paste (Ctrl+V) with the text still selected.
6. Instead of replacing the selected text with the raw URL, Nexus Notes detects that you pasted a URL over selected text and automatically formats it as a Markdown link:
   ```
   Read more about this on [official documentation](https://example.com).
   ```

**What to observe**:

- Smart paste only activates when two conditions are met: you have text selected, and the thing you are pasting is a URL (starting with `https://` or `http://`).
- If you paste a URL without any text selected, it pastes the raw URL as normal.
- If you paste non-URL text over a selection, it replaces the selection as normal.
- This feature saves the manual effort of typing the `[text](url)` syntax by hand.

---

### Use Case 11: Using Daily Notes

**Goal**: Use the Ctrl+D shortcut to create and open a daily note for today, and understand how daily notes are organized.

**Steps**:

1. Press **Ctrl+D** from anywhere in the app.
2. Nexus Notes will open a note named with today's date in `YYYY-MM-DD` format (for example, `2026-03-10.md`). The note is stored in the `Daily/` folder inside your vault. If the `Daily/` folder does not exist yet, it is created automatically.
3. If a daily note for today already exists, Ctrl+D opens it rather than creating a duplicate. This means you can press Ctrl+D at any point during the day and always land on the same note.
4. Use the daily note as a scratchpad for tasks, thoughts, and links. When something grows into a topic worth its own note, create a wiki-link to it and write the full content there.

**What to observe**:

- The note filename is always `YYYY-MM-DD.md`, derived from the current local date.
- Daily notes live in `Daily/` so they stay separate from your regular notes in the sidebar.
- Ctrl+D works even when the editor is focused, the search panel is open, or no note is currently open.
- Over time, the `Daily/` folder becomes a chronological log you can scroll through to recall what you were working on.

---

## 4. Complete Feature Reference

### Sidebar / File Explorer

The left sidebar is your file manager for the vault. It is 260 pixels wide by default and can be toggled visible or hidden using the small arrow button on the left edge of the center panel.

**Resizing Panels**

You can resize the left sidebar and the right panel by dragging their edges:

- Hover over the edge between the sidebar and the editor. The cursor changes and the edge highlights in blue to indicate it is draggable.
- Click and drag to the desired width. The sidebar and right panel each have a minimum width of 150px and a maximum width of 500px.
- The same applies to the right panel edge. Drag it left or right to give more space to the editor or to the Backlinks/Graph panel.

**Creating Notes**

- Click the "+" button in the sidebar header, or press **Ctrl+N** anywhere in the app.
- You will be prompted for a name. The `.md` extension is added automatically.
- The note is created and immediately opened in the editor.
- You can also right-click anywhere in the file tree and choose "New Note".

**Creating Folders**

- Right-click in the file tree area and choose "New Folder".
- You will be prompted for a folder name.
- Folders can be nested inside other folders by right-clicking an existing folder and choosing "New Folder".

**Renaming**

- Right-click the note or folder you want to rename and choose "Rename".
- The name in the sidebar becomes an editable text field. Type the new name and press Enter to confirm, or press Escape to cancel.

**Deleting**

- Right-click the note or folder you want to delete and choose "Delete".
- A confirmation dialog will appear. Click OK to confirm.
- Deleted files are moved to the operating system's trash, so they can be recovered if you change your mind.

**Drag and Drop to Reorganize**

- Click and hold a note in the sidebar, then drag it onto a folder. The folder highlights with a dashed blue outline when you are hovering over it correctly. Release to move the note into the folder.
- You cannot drop a note onto another note, only onto a folder.
- You cannot drop a folder into itself or into one of its own sub-folders.

**Dropping External Files**

- Drag a file from outside Nexus Notes (such as from Windows Explorer or macOS Finder) and drop it onto the sidebar.
- Markdown files (`.md`) are copied directly into the vault root. If a note with the same name already exists, the copy is skipped silently.
- Other file types (images, PDFs, etc.) are copied into an `Attachments` folder inside the vault.

**Refreshing the Sidebar**

- If you add, remove, or rename files directly in the vault folder using another program, click the refresh button (the circular arrow) in the sidebar header to reload the file tree.

---

### Editor

The editor is the center area of the application. It is powered by CodeMirror and uses a monospace font (JetBrains Mono or similar) for consistent Markdown editing.

**Markdown Syntax Reference**

| Syntax | Result |
|---|---|
| `# Heading` | Large heading (H1) |
| `## Heading` | Medium heading (H2) |
| `### Heading` | Small heading (H3) |
| `**bold**` | Bold text |
| `*italic*` | Italic text |
| `` `inline code` `` | Inline code span |
| `- item` | Bullet list item |
| `* item` | Bullet list item (alternative) |
| `1. item` | Numbered list item |
| `- [ ] task` | Unchecked task item |
| `- [x] task` | Checked task item |
| `[text](url)` | Standard hyperlink |
| `[[Note Name]]` | Wiki-link to another note |
| `[[Note Name\|Display Text]]` | Wiki-link with custom display text |
| `![alt](image.png)` | Embedded image |
| `---` | Horizontal rule / divider |
| `> text` | Blockquote |
| ` ```code block``` ` | Fenced code block |

**Toolbar Reference**

The toolbar appears above the editor whenever a note is open.

| Button | Action | Keyboard Shortcut |
|---|---|---|
| **B** | Toggle bold on selection | Ctrl+B |
| *I* | Toggle italic on selection | Ctrl+I |
| `<>` | Toggle inline code on selection | (none) |
| H1 | Insert H1 heading marker | (none) |
| H2 | Insert H2 heading marker | (none) |
| H3 | Insert H3 heading marker | (none) |
| (separator) | | |
| Bullet (•) | Insert bullet list item | (none) |
| Numbered (1.) | Insert numbered list item | (none) |
| Checkbox (☑) | Insert checkbox item | (none) |
| Link (🔗) | Insert link syntax | Ctrl+K |
| Horizontal rule (―) | Insert `---` divider | (none) |
| Code block (```) | Insert fenced code block | Ctrl+Shift+K |

When text is selected before clicking a toolbar button, the selection is wrapped or prefixed with the appropriate syntax. When nothing is selected, placeholder text is inserted.

**Auto-Save Behavior**

Every keystroke starts a 300-millisecond countdown timer. When you stop typing for 300 milliseconds, the note is saved to disk. This means:

- You never need to manually save.
- If you type continuously, saving is deferred until you pause.
- Switching to a different note or closing the app after a brief pause will have saved your work.

**Line Numbers**

The editor shows line numbers in the left gutter. They are displayed in a muted color and do not interfere with writing.

---

### Wiki-Links

Wiki-links are the primary way of connecting notes in Nexus Notes.

**Basic Syntax**

```
[[Note Name]]
```

Type two opening square brackets, the name of the target note, and two closing square brackets. The link is rendered in blue with a dotted underline.

**Alias Syntax (Custom Display Text)**

```
[[Note Name|Display Text]]
```

If you want the link to display differently from the note name, add a pipe character `|` followed by the display text. For example:

```
See my [[Project Roadmap|roadmap]] for details.
```

This displays as a link labeled "roadmap" that navigates to the "Project Roadmap" note.

**Auto-Create Missing Notes**

If you Ctrl+click a wiki-link where the target note does not exist, the note is created automatically and opened. You do not need to pre-create notes before linking to them.

**Autocomplete**

When you type `[[` in the editor, an autocomplete list appears showing all notes in your vault. Use the arrow keys to navigate the list and press Enter to insert the selected note name. The closing `]]` is added automatically.

---

### Backlinks Panel

The Backlinks panel is on the right side of the application, accessible via the "Links" tab in the right panel header.

**What Backlinks Are**

A backlink is a reference from one note to the note you are currently viewing. If note A contains `[[Note B]]`, then when you open Note B, Note A appears in its backlinks.

**How They Are Grouped**

Backlinks are grouped by source note. Each source note name appears as a clickable blue heading. Below the heading are context snippets - the actual lines of text from the source note that contain the link.

**Navigating via Backlinks**

Click any source note name in the Backlinks panel to open that note in the editor. This makes it easy to follow a chain of references in reverse.

**When There Are No Backlinks**

The panel displays "No backlinks" in muted text. This is normal for new notes or notes that are not yet referenced by anything else.

---

### Search

The Search panel is a full-text search tool for finding content across your entire vault.

**Opening Search**

- Press **Ctrl+Shift+F** to open the search panel.
- Press **Ctrl+O** to open the same search panel (useful as a quick-open shortcut).
- The search input is focused automatically when the panel opens.

**Search Features**

- Search is case-insensitive.
- Results appear as you type, with a 200-millisecond debounce delay to avoid searching on every keystroke.
- Each result shows the note title and up to two matching lines of context.
- Matching text within context snippets is highlighted in yellow for easy spotting.
- If no results are found for a non-empty query, "No results found" is displayed.

**Keyboard Navigation**

| Key | Action |
|---|---|
| Arrow Down | Move selection to the next result |
| Arrow Up | Move selection to the previous result |
| Enter | Open the selected result |
| Escape | Close the search panel without navigating |

**Mouse Navigation**

Click any result in the list to open that note. The search panel closes automatically.

---

### Graph View

The Graph view provides a visual representation of your entire vault as a network diagram.

**Opening the Graph**

- Click the "Graph" tab in the right panel header.
- Press **Ctrl+G** to toggle between Graph and Backlinks view.

**What the Graph Shows**

- Every note in your vault is represented as a circular node.
- Every wiki-link between two notes is represented as a line connecting those nodes.
- Notes that have no links are still shown as isolated nodes, floating separately.

**Color Coding**

| Element | Color | Meaning |
|---|---|---|
| Active note node | Blue (accent) | The note currently open in the editor |
| Connected note node | Light blue | Notes directly linked to the active note |
| Other note nodes | Muted grey | Notes with no direct link to the active note |
| Active links | Bright blue line | Lines connecting the active note to its neighbors |
| Other links | Faint grey line | All other connections in the vault |

**Interaction**

| Action | What it does |
|---|---|
| Click a node | Navigates to that note in the editor |
| Drag a node | Repositions that node; the simulation adjusts around it |
| Scroll wheel | Zooms in and out of the graph |
| Drag empty space | Pans the graph view |

The graph uses a physics-based force simulation. Nodes repel each other and links act like springs, pulling connected nodes closer together. When you drag a node, it "locks" in place temporarily, then releases after you let go.

The zoom range is from 10% to 400% of the default scale.

---

## 5. Keyboard Shortcuts Reference

### File and Navigation

| Shortcut | Action |
|---|---|
| Ctrl+N | Create a new note |
| Ctrl+D | Open or create today's daily note |
| Ctrl+O | Open search / quick open |
| Ctrl+Shift+F | Open search panel |
| Ctrl+G | Toggle Graph view |

### Editor Formatting

| Shortcut | Action |
|---|---|
| Ctrl+B | Toggle bold |
| Ctrl+I | Toggle italic |
| Ctrl+K | Insert link |
| Ctrl+Shift+K | Insert code block |
| Ctrl+Enter | Toggle checkbox (check/uncheck) |

### List Editing

| Shortcut | Action |
|---|---|
| Enter (in a list) | Continue the list on the next line |
| Enter (on an empty list item) | Exit the list |
| Tab (on a list line) | Indent the list item |
| Shift+Tab (on a list line) | Outdent the list item |

### Smart Paste

| Action | Shortcut |
|---|---|
| Paste URL over selected text | Ctrl+V (with text selected and URL in clipboard) |

### Interface

| Shortcut | Action |
|---|---|
| Escape (in search) | Close the search panel |
| Arrow keys (in search) | Navigate results |
| Enter (in search) | Open selected result |

---

## 6. Tips and Tricks

### Building a Personal Wiki

The most effective way to use Nexus Notes as a personal wiki is to think in small, focused notes. Instead of one giant note called "Everything I Know About Marketing", write separate notes for each concept: "SEO Basics", "Email Campaign Strategy", "Social Media Planning", and so on. Then link them together.

When you read something new or have an idea, create a note for it immediately and link it to related notes. Over time, your graph will grow into a genuine web of knowledge that you can navigate from any starting point.

### Daily Notes Workflow

Press **Ctrl+D** at any time to open today's daily note. The note is named with the current date in `YYYY-MM-DD` format (for example, `2026-03-10.md`) and stored in the `Daily/` folder inside your vault. If today's note already exists, Ctrl+D opens it — it never creates duplicates.

Use the daily note as a scratchpad for the day's thoughts, tasks, and references. When something in your daily note deserves its own permanent note, create a wiki-link to a new note and write the full content there.

This gives you a running log of your days while keeping reference material organized separately.

### Project Documentation Pattern

For each project, create a top-level note with the project name (for example, `Website Redesign`). Use this note as a table of contents, with wiki-links to sub-notes for each area:

```
# Website Redesign

## Key Documents
- [[Website Redesign - Requirements]]
- [[Website Redesign - Meeting Notes]]
- [[Website Redesign - Design Decisions]]
- [[Website Redesign - Open Questions]]
```

Each sub-note links back to the main project note, creating a tight cluster in the graph. You can navigate the whole project from any note.

### Zettelkasten-Lite Method

The Zettelkasten method is a note-taking philosophy where every note captures a single, atomic idea, and notes are connected by explicit links rather than folders. Nexus Notes supports this style naturally.

To try it:
1. Write notes on single ideas, as short as a paragraph.
2. Always link to related ideas using wiki-links.
3. Avoid deep folder hierarchies. Let the links create the structure.
4. Periodically review the graph to discover unexpected connections between ideas.

Over time, your vault becomes a "second brain" where the structure of links reveals relationships you might not have noticed consciously.

### Using Folders vs Links for Organization

Both folders and links can be used to organize notes, and they serve different purposes:

- **Folders** are good for broad, permanent categories that will not change much - such as "Work", "Personal", and "Reference". They give you a visual hierarchy in the sidebar.
- **Links** are good for dynamic relationships that emerge naturally as you write. A note can be related to many topics simultaneously through links, which a folder structure cannot represent.

A practical approach: use a few top-level folders for broad areas of your life, and rely on wiki-links for everything more specific. Let the graph tell you how your ideas actually connect rather than forcing them into a tree hierarchy up front.

---

## 7. Troubleshooting

### My note does not seem to be saving

Nexus Notes saves automatically after a 300-millisecond pause in typing. If you are concerned a note was not saved:

- Stop typing for a moment and let the auto-save timer fire.
- Close and reopen the note by clicking another note and then clicking back.
- If the content is still there, it was saved.
- If the vault folder was moved or deleted from outside the app, saving may fail silently. Verify that the vault folder still exists at its original location.

### A wiki-link is not navigating to the right note

Wiki-links match by exact note name (not case-sensitive in most configurations, but the name must otherwise match). Check:

- **Spelling**: The name inside `[[double brackets]]` must match the filename of the target note exactly.
- **No extension needed**: Do not include `.md` in the link. Write `[[My Note]]`, not `[[My Note.md]]`.
- **Folders do not affect links**: A note inside a sub-folder can be linked using just its name, not a path. `[[My Note]]` works whether the note is in the root or in a nested folder.

If a link creates a new note instead of navigating to an existing one, the names do not match. Open the sidebar, find the existing note, and compare its filename to what you typed in the link.

### A file I added to the vault folder is not appearing in the sidebar

Nexus Notes watches the vault folder for changes in real time using chokidar with a 100ms debounce, so files added or removed externally should appear in the sidebar within a fraction of a second. If a file is still not showing up, the most likely cause is that it was added to a location outside the current vault folder, or the vault was switched without reloading. Click the refresh button (the circular arrow icon in the sidebar header) to force a rescan of the vault folder and update the file tree.

### The graph view is empty or shows only some notes

The graph loads when you switch to the Graph tab. If it appears empty, try:

- Clicking the "Links" tab and then clicking "Graph" again to trigger a reload.
- Making sure your notes actually contain wiki-links. Notes without any links will still appear as isolated nodes, but may be hard to see if the graph is zoomed out.
- Scrolling or zooming in the graph in case notes are outside the visible area.

### I accidentally deleted a note

Deleted notes are sent to the operating system's trash (Recycle Bin on Windows, Trash on macOS). Open the trash in your file explorer and restore the file back into your vault folder. Then click the refresh button in the sidebar.

### The app opened but my vault is not loading

If you see the "Open Vault" screen instead of your notes, the previously saved vault path may no longer be valid (for example, if you moved the folder). Click "Open Vault" and navigate to where your vault folder currently lives. The app will save the new location for next time.
