import React, { useEffect, useState, useCallback, useRef } from 'react'
import { FileExplorer } from './components/Sidebar/FileExplorer'
import { MarkdownEditor } from './components/Editor/MarkdownEditor'
import { EditorToolbar } from './components/EditorToolbar'
import { BacklinksPanel } from './components/BacklinksPanel'
import { SearchPanel } from './components/SearchPanel'
import { GraphView } from './components/GraphView'
import { PromptDialog } from './components/PromptDialog'
import { useVaultStore } from './store/vault-store'
import { useVault } from './hooks/useVault'

const App: React.FC = () => {
  const {
    vaultPath, fileTree, activeFile, activeContent,
    backlinks, showSearch, showGraph,
    sidebarVisible, rightPanelVisible,
    toggleSearch, toggleGraph, toggleSidebar, toggleRightPanel
  } = useVaultStore()

  const { loadVault, openNote, saveNote, refreshVault, navigateToLink } = useVault()
  const [loading, setLoading] = useState(true)
  const [showNewNotePrompt, setShowNewNotePrompt] = useState(false)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [rightPanelWidth, setRightPanelWidth] = useState(280)
  const resizingRef = useRef<'left' | 'right' | null>(null)

  const handleResizeStart = useCallback((side: 'left' | 'right') => {
    resizingRef.current = side
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent): void => {
      if (resizingRef.current === 'left') {
        setSidebarWidth(Math.max(150, Math.min(500, e.clientX)))
      } else if (resizingRef.current === 'right') {
        setRightPanelWidth(Math.max(150, Math.min(500, window.innerWidth - e.clientX)))
      }
    }

    const onMouseUp = (): void => {
      resizingRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  // Init: load saved vault or show selector
  useEffect(() => {
    const init = async (): Promise<void> => {
      const saved = await window.api.getSavedVault()
      if (saved) {
        await loadVault(saved)
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleSelectVault = async (): Promise<void> => {
    const selected = await window.api.selectVault()
    if (selected) {
      await loadVault(selected)
    }
  }

  const handleContentChange = useCallback((content: string) => {
    useVaultStore.getState().setActiveContent(content)
    if (!activeFile) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveNote(activeFile, content)
    }, 300)
  }, [activeFile, saveNote])

  const handleToolbarAction = useCallback((action: string) => {
    const cmElement = document.querySelector('.cm-editor') as any
    const view = cmElement?.cmView?.view
    if (!view) return

    const { from, to } = view.state.selection.main
    const selected = view.state.doc.sliceString(from, to)

    const insertions: Record<string, { text: string; cursorOffset?: number }> = {
      bold: { text: `**${selected || 'bold'}**` },
      italic: { text: `*${selected || 'italic'}*` },
      code: { text: `\`${selected || 'code'}\`` },
      h1: { text: `# ${selected || 'Heading 1'}` },
      h2: { text: `## ${selected || 'Heading 2'}` },
      h3: { text: `### ${selected || 'Heading 3'}` },
      bullet: { text: `- ${selected || 'item'}` },
      numbered: { text: `1. ${selected || 'item'}` },
      checkbox: { text: `- [ ] ${selected || 'task'}` },
      link: { text: `[${selected || 'text'}](url)` },
      hr: { text: '\n---\n' },
      codeblock: { text: `\`\`\`\n${selected || ''}\n\`\`\`` }
    }

    const ins = insertions[action]
    if (ins) {
      view.dispatch({
        changes: { from, to, insert: ins.text }
      })
      view.focus()
    }
  }, [])

  const handleCreateNote = useCallback(async (name: string) => {
    setShowNewNotePrompt(false)
    if (!vaultPath || !name) return
    try {
      const notesDir = vaultPath + '/Notes'
      const filePath = await window.api.createNote(notesDir, name)
      await refreshVault()
      await openNote(filePath)
    } catch (err: any) {
      console.error('Failed to create note:', err)
    }
  }, [vaultPath, refreshVault, openNote])

  // Create or open today's daily note
  const handleDailyNote = useCallback(async () => {
    if (!vaultPath) return
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const dailyDir = vaultPath + '/Daily'
    try {
      const filePath = await window.api.createNote(dailyDir, today)
      await refreshVault()
      await openNote(filePath)
    } catch {
      // File already exists — just open it
      const existingPath = dailyDir + '/' + today + '.md'
      await openNote(existingPath)
    }
  }, [vaultPath, refreshVault, openNote])

  // Shared shortcut handler used by both keydown and IPC shortcut events
  const handleShortcutAction = useCallback((key: string, shift: boolean) => {
    if (showNewNotePrompt) return
    if (shift && key === 'f') {
      toggleSearch()
    } else if (key === 'g') {
      toggleGraph()
    } else if (key === 'd') {
      handleDailyNote()
    } else if (key === 'n') {
      if (vaultPath) {
        setShowNewNotePrompt(true)
      }
    } else if (key === 'o') {
      toggleSearch()
    }
  }, [vaultPath, showNewNotePrompt, toggleSearch, toggleGraph, handleDailyNote])

  // Keyboard shortcuts (for keys not intercepted by Chromium)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey) {
        handleShortcutAction(e.key.toLowerCase(), e.shiftKey)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleShortcutAction])

  // IPC shortcut events (for Chromium-reserved keys like Ctrl+N, Ctrl+O, Ctrl+G, Ctrl+W)
  useEffect(() => {
    const cleanup = window.api.onShortcut((data) => {
      handleShortcutAction(data.key, data.shift)
    })
    return cleanup
  }, [handleShortcutAction])

  if (loading) {
    return <div className="vault-select-screen"><p>Loading...</p></div>
  }

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

  const layoutClasses = [
    'app-layout',
    !sidebarVisible && 'sidebar-hidden',
    !rightPanelVisible && 'right-hidden'
  ].filter(Boolean).join(' ')

  return (
    <div className={layoutClasses}>
      <div style={{ width: sidebarVisible ? sidebarWidth : 0, flexShrink: 0, overflow: 'hidden' }}>
        <FileExplorer
          fileTree={fileTree}
          activeFile={activeFile}
          onFileClick={openNote}
          onRefresh={refreshVault}
        />
      </div>

      {sidebarVisible && (
        <div className="resize-handle" onMouseDown={() => handleResizeStart('left')} />
      )}

      <div className="center-panel" style={{ position: 'relative' }}>
        <button className="toggle-btn toggle-sidebar-btn" onClick={toggleSidebar} title="Toggle Sidebar">
          {sidebarVisible ? '\u25C0' : '\u25B6'}
        </button>
        <button className="toggle-btn toggle-right-btn" onClick={toggleRightPanel} title="Toggle Right Panel">
          {rightPanelVisible ? '\u25B6' : '\u25C0'}
        </button>

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
          <div className="empty-editor">
            Select a note or press Ctrl+N to create one
          </div>
        )}
      </div>

      {rightPanelVisible && (
        <div className="resize-handle" onMouseDown={() => handleResizeStart('right')} />
      )}

      <div className="right-panel" style={{ width: rightPanelVisible ? rightPanelWidth : 0 }}>
        <div className="right-panel-header">
          <h3>{showGraph ? 'Graph' : 'Backlinks'}</h3>
          <div className="right-panel-tabs">
            <button className={!showGraph ? 'active' : ''} onClick={() => showGraph && toggleGraph()}>
              Links
            </button>
            <button className={showGraph ? 'active' : ''} onClick={() => !showGraph && toggleGraph()}>
              Graph
            </button>
          </div>
        </div>
        <div className="right-panel-content">
          {showGraph ? (
            <GraphView activeFile={activeFile} onNavigate={navigateToLink} />
          ) : (
            <BacklinksPanel backlinks={backlinks} onNavigate={openNote} />
          )}
        </div>
      </div>

      {showSearch && (
        <SearchPanel onClose={toggleSearch} onOpenNote={openNote} />
      )}

      {showNewNotePrompt && (
        <PromptDialog
          message="New note name:"
          onSubmit={handleCreateNote}
          onCancel={() => setShowNewNotePrompt(false)}
        />
      )}
    </div>
  )
}

export default App
