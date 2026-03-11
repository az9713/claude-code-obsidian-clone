import React, { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { wikiLinkPlugin } from './cm-wiki-link'
import { wikiLinkAutocomplete } from './cm-autocomplete'
import { smartEditExtensions } from './cm-smart-edit'
import { createDropHandler } from './cm-drop-handler'
import { useVaultStore } from '../../store/vault-store'

interface MarkdownEditorProps {
  content: string
  filePath: string | null
  onContentChange: (content: string) => void
  onNavigate: (target: string) => void
}

// Dark theme for CodeMirror
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--fg)',
    height: '100%'
  },
  '.cm-content': {
    caretColor: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    padding: '16px 20px'
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--accent)',
    borderLeftWidth: '2px'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'var(--selection) !important'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--fg-dim)',
    border: 'none'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--fg-muted)'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--accent-dim)',
    border: 'none',
    color: 'var(--accent)'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '6px'
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li': {
      padding: '4px 8px'
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: 'var(--accent-dim)',
      color: 'var(--accent)'
    }
  }
}, { dark: true })

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  filePath,
  onContentChange,
  onNavigate
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingFileRef = useRef(false)
  const vaultPath = useVaultStore((s) => s.vaultPath)
  const noteNames = useVaultStore((s) => s.noteNames)

  const getNoteNames = useCallback(() => noteNames, [noteNames])
  const getVaultPath = useCallback(() => vaultPath, [vaultPath])
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isLoadingFileRef.current) {
        const newContent = update.state.doc.toString()
        onContentChange(newContent)
      }
    })

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightSpecialChars(),
        drawSelection(),
        bracketMatching(),
        history(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        highlightSelectionMatches(),
        markdown(),
        darkTheme,
        wikiLinkPlugin,
        wikiLinkAutocomplete(getNoteNames),
        smartEditExtensions,
        createDropHandler(getVaultPath),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab
        ]),
        updateListener,
        EditorView.lineWrapping
      ]
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    // Click handler for wiki links - Ctrl+click to navigate, plain click to edit
    const clickHandler = (event: MouseEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return

      const line = view.state.doc.lineAt(pos)
      const lineText = line.text
      const posInLine = pos - line.from

      const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
      let match: RegExpExecArray | null
      while ((match = re.exec(lineText)) !== null) {
        if (posInLine >= match.index && posInLine <= match.index + match[0].length) {
          onNavigateRef.current(match[1].trim())
          event.preventDefault()
          event.stopPropagation()
          return
        }
      }
    }

    view.dom.addEventListener('click', clickHandler)
    viewRef.current = view

    return () => {
      view.dom.removeEventListener('click', clickHandler)
      view.destroy()
      viewRef.current = null
    }
  }, []) // Only create once

  // Update content when file changes — flag to prevent auto-save from firing
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (currentContent !== content) {
      isLoadingFileRef.current = true
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content
        }
      })
      isLoadingFileRef.current = false
    }
  }, [content, filePath])

  return <div ref={containerRef} className="editor-container" />
}
