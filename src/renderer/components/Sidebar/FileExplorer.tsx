import React, { useState, useRef, useCallback } from 'react'
import { FileNode } from '../../lib/types'
import { FileTreeItem } from './FileTreeItem'
import { PromptDialog } from '../PromptDialog'
import { useVaultStore } from '../../store/vault-store'

interface FileExplorerProps {
  fileTree: FileNode | null
  activeFile: string | null
  onFileClick: (filePath: string) => void
  onRefresh: () => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  node: FileNode | null
}

type PromptMode = null | 'newNote' | 'newNoteTop' | 'newFolder' | 'confirmDelete'

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fileTree,
  activeFile,
  onFileClick,
  onRefresh
}) => {
  const vaultPath = useVaultStore((s) => s.vaultPath)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  })
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [promptMode, setPromptMode] = useState<PromptMode>(null)
  const [promptDir, setPromptDir] = useState<string>('')
  const draggedNodeRef = useRef<FileNode | null>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, node })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu((s) => ({ ...s, visible: false }))
  }, [])

  const handleNewNote = (): void => {
    closeContextMenu()
    const dir = contextMenu.node?.type === 'directory' ? contextMenu.node.path : vaultPath
    if (!dir) return
    setPromptDir(dir)
    setPromptMode('newNote')
  }

  const handleNewFolder = (): void => {
    closeContextMenu()
    const dir = contextMenu.node?.type === 'directory' ? contextMenu.node.path : vaultPath
    if (!dir) return
    setPromptDir(dir)
    setPromptMode('newFolder')
  }

  const handlePromptSubmit = async (name: string): Promise<void> => {
    const mode = promptMode
    const dir = promptDir
    setPromptMode(null)

    if (!name || !dir) return

    if (mode === 'newNote' || mode === 'newNoteTop') {
      try {
        const filePath = await window.api.createNote(dir, name)
        onRefresh()
        onFileClick(filePath)
      } catch (err: any) {
        console.error(err.message)
      }
    } else if (mode === 'newFolder') {
      await window.api.createFolder(dir, name)
      onRefresh()
    }
  }

  const handleDelete = async (): Promise<void> => {
    closeContextMenu()
    if (!contextMenu.node) return
    // Use a simple confirm — this one actually works in Electron
    await window.api.deleteNote(contextMenu.node.path)
    onRefresh()
  }

  const handleStartRename = (): void => {
    closeContextMenu()
    if (!contextMenu.node) return
    setRenaming(contextMenu.node.path)
    setRenameValue(contextMenu.node.name)
  }

  const handleRename = async (): Promise<void> => {
    if (!renaming || !renameValue.trim()) {
      setRenaming(null)
      return
    }
    const parentDir = renaming.split(/[/\\]/).slice(0, -1).join('/')
    const newPath = `${parentDir}/${renameValue}`
    try {
      await window.api.renameNote(renaming, newPath)
      onRefresh()
    } catch (err: any) {
      console.error(err.message)
    }
    setRenaming(null)
  }

  const handleDragStart = (node: FileNode): void => {
    draggedNodeRef.current = node
  }

  const handleDrop = async (targetNode: FileNode): Promise<void> => {
    const dragged = draggedNodeRef.current
    if (!dragged || !targetNode || targetNode.type !== 'directory') return
    if (dragged.path === targetNode.path) return
    if (targetNode.path.startsWith(dragged.path)) return

    await window.api.moveNote(dragged.path, targetNode.path)
    draggedNodeRef.current = null
    onRefresh()
  }

  const handleNewNoteTop = (): void => {
    if (!vaultPath) return
    setPromptDir(vaultPath)
    setPromptMode('newNoteTop')
  }

  const handleExternalDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    if (!vaultPath) return

    const files = e.dataTransfer.files
    if (!files.length) return

    for (const file of Array.from(files)) {
      const filePath = (file as any).path as string
      if (!filePath) continue

      if (filePath.endsWith('.md')) {
        const content = await window.api.readNote(filePath)
        const name = filePath.split(/[/\\]/).pop() || 'note.md'
        try {
          const newPath = await window.api.createNote(vaultPath, name)
          await window.api.writeNote(newPath, content)
        } catch { /* ignore duplicates */ }
      } else {
        await window.api.copyAttachment(filePath, vaultPath)
      }
    }
    onRefresh()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Explorer</h2>
        <div className="sidebar-actions">
          <button onClick={handleNewNoteTop} title="New Note">+</button>
          <button onClick={onRefresh} title="Refresh">{'\u21BB'}</button>
        </div>
      </div>
      <div
        className="file-tree"
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={handleExternalDrop}
      >
        {fileTree?.children?.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={0}
            activeFile={activeFile}
            onFileClick={onFileClick}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {contextMenu.visible && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={closeContextMenu}
          />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button className="context-menu-item" onClick={handleNewNote}>New Note</button>
            <button className="context-menu-item" onClick={handleNewFolder}>New Folder</button>
            <button className="context-menu-item" onClick={handleStartRename}>Rename</button>
            <button className="context-menu-item danger" onClick={handleDelete}>Delete</button>
          </div>
        </>
      )}

      {promptMode && (
        <PromptDialog
          message={
            promptMode === 'newFolder' ? 'Folder name:' : 'Note name:'
          }
          onSubmit={handlePromptSubmit}
          onCancel={() => setPromptMode(null)}
        />
      )}
    </div>
  )
}
