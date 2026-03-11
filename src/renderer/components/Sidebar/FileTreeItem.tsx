import React, { useState, useRef } from 'react'
import { FileNode } from '../../lib/types'

interface FileTreeItemProps {
  node: FileNode
  depth: number
  activeFile: string | null
  onFileClick: (filePath: string) => void
  onContextMenu: (event: React.MouseEvent, node: FileNode) => void
  onDragStart: (node: FileNode) => void
  onDrop: (targetNode: FileNode) => void
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  depth,
  activeFile,
  onFileClick,
  onContextMenu,
  onDragStart,
  onDrop
}) => {
  const [expanded, setExpanded] = useState(depth < 1)
  const [dragOver, setDragOver] = useState(false)

  const isDir = node.type === 'directory'
  const isActive = node.path === activeFile
  const isMd = node.name.endsWith('.md')

  const handleClick = (): void => {
    if (isDir) {
      setExpanded(!expanded)
    } else if (isMd) {
      onFileClick(node.path)
    }
  }

  const handleDragStart = (e: React.DragEvent): void => {
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart(node)
  }

  const handleDragOver = (e: React.DragEvent): void => {
    if (isDir) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOver(true)
    }
  }

  const handleDragLeave = (): void => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (isDir) {
      onDrop(node)
    }
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    onContextMenu(e, node)
  }

  const icon = isDir ? (expanded ? '\u25BE' : '\u25B8') : '\u2022'

  return (
    <>
      <div
        className={`tree-item ${isActive ? 'active' : ''} ${dragOver ? 'drag-over' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="icon">{icon}</span>
        <span className="name">{isMd ? node.name.replace('.md', '') : node.name}</span>
      </div>
      {isDir && expanded && node.children?.map((child) => (
        <FileTreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          activeFile={activeFile}
          onFileClick={onFileClick}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          onDrop={onDrop}
        />
      ))}
    </>
  )
}
