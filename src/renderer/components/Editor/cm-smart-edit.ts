import { EditorView, KeyBinding, keymap } from '@codemirror/view'
import { EditorState, Transaction, StateField, StateEffect } from '@codemirror/state'

// Auto-continue lists on Enter
function handleEnterInList(view: EditorView): boolean {
  const { state } = view
  const { from } = state.selection.main

  const line = state.doc.lineAt(from)
  const text = line.text

  // Check for bullet list: "  - item" or "  * item"
  const bulletMatch = text.match(/^(\s*)([-*])\s(.*)$/)
  if (bulletMatch) {
    const [, indent, marker, content] = bulletMatch
    if (content.trim() === '') {
      // Empty bullet — remove it
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' }
      })
      return true
    }
    view.dispatch({
      changes: { from, to: from, insert: `\n${indent}${marker} ` },
      selection: { anchor: from + indent.length + 3 }
    })
    return true
  }

  // Check for numbered list: "  1. item"
  const numMatch = text.match(/^(\s*)(\d+)\.\s(.*)$/)
  if (numMatch) {
    const [, indent, num, content] = numMatch
    if (content.trim() === '') {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' }
      })
      return true
    }
    const next = parseInt(num) + 1
    view.dispatch({
      changes: { from, to: from, insert: `\n${indent}${next}. ` },
      selection: { anchor: from + indent.length + `${next}. `.length + 1 }
    })
    return true
  }

  // Check for checkbox: "  - [ ] item" or "  - [x] item"
  const checkMatch = text.match(/^(\s*[-*])\s\[[ x]\]\s(.*)$/)
  if (checkMatch) {
    const [, prefix, content] = checkMatch
    if (content.trim() === '') {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' }
      })
      return true
    }
    view.dispatch({
      changes: { from, to: from, insert: `\n${prefix} [ ] ` },
      selection: { anchor: from + prefix.length + 6 }
    })
    return true
  }

  return false
}

// Tab/Shift+Tab for list indentation
function handleTabInList(view: EditorView, indent: boolean): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const text = line.text

  if (/^\s*[-*\d]/.test(text)) {
    if (indent) {
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: '  ' }
      })
    } else {
      const leadingSpaces = text.match(/^(\s*)/)?.[1] || ''
      if (leadingSpaces.length >= 2) {
        view.dispatch({
          changes: { from: line.from, to: line.from + 2, insert: '' }
        })
      }
    }
    return true
  }
  return false
}

// Toggle checkbox
function toggleCheckbox(view: EditorView): boolean {
  const { state } = view
  const { from } = state.selection.main
  const line = state.doc.lineAt(from)
  const text = line.text

  const unchecked = text.indexOf('[ ]')
  if (unchecked !== -1) {
    view.dispatch({
      changes: { from: line.from + unchecked, to: line.from + unchecked + 3, insert: '[x]' }
    })
    return true
  }

  const checked = text.indexOf('[x]')
  if (checked !== -1) {
    view.dispatch({
      changes: { from: line.from + checked, to: line.from + checked + 3, insert: '[ ]' }
    })
    return true
  }

  return false
}

// Toggle bold
function toggleBold(view: EditorView): boolean {
  return toggleWrap(view, '**')
}

// Toggle italic
function toggleItalic(view: EditorView): boolean {
  return toggleWrap(view, '*')
}

// Toggle inline code
function toggleInlineCode(view: EditorView): boolean {
  return toggleWrap(view, '`')
}

function toggleWrap(view: EditorView, marker: string): boolean {
  const { state } = view
  const { from, to } = state.selection.main

  if (from === to) {
    // No selection — insert markers with cursor in middle
    view.dispatch({
      changes: { from, to, insert: `${marker}${marker}` },
      selection: { anchor: from + marker.length }
    })
    return true
  }

  const selected = state.doc.sliceString(from, to)

  // Check if already wrapped
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
    const unwrapped = selected.slice(marker.length, -marker.length)
    view.dispatch({
      changes: { from, to, insert: unwrapped },
      selection: { anchor: from, head: from + unwrapped.length }
    })
  } else {
    view.dispatch({
      changes: { from, to, insert: `${marker}${selected}${marker}` },
      selection: { anchor: from, head: from + selected.length + marker.length * 2 }
    })
  }
  return true
}

// Insert link
function insertLink(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.doc.sliceString(from, to)

  if (selected) {
    view.dispatch({
      changes: { from, to, insert: `[${selected}](url)` },
      selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 }
    })
  } else {
    view.dispatch({
      changes: { from, to, insert: '[](url)' },
      selection: { anchor: from + 1 }
    })
  }
  return true
}

// Insert code block
function insertCodeBlock(view: EditorView): boolean {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.doc.sliceString(from, to)

  const block = `\`\`\`\n${selected}\n\`\`\``
  view.dispatch({
    changes: { from, to, insert: block },
    selection: { anchor: from + 4 }
  })
  return true
}

// Auto-close pairs: typing opening marker inserts closing marker with cursor in between
const closePairsInputRule = EditorView.inputHandler.of(
  (view: EditorView, from: number, to: number, text: string): boolean => {
    const doc = view.state.doc
    const before = from > 0 ? doc.sliceString(from - 1, from) : ''

    // Typing second * after first * → insert ** ** with cursor in middle
    if (text === '*' && before === '*') {
      // User just typed **, insert closing **
      view.dispatch({
        changes: { from: to, to, insert: '**' },
        selection: { anchor: to }
      })
      return false // let the * be inserted normally, then cursor is before closing **
    }

    // Typing [ after [ → insert closing ]]
    if (text === '[' && before === '[') {
      view.dispatch({
        changes: { from: to, to, insert: ']]' },
        selection: { anchor: to }
      })
      return false
    }

    // Typing single backtick → insert closing backtick
    if (text === '`' && before !== '`') {
      view.dispatch({
        changes: [
          { from, to, insert: '``' }
        ],
        selection: { anchor: from + 1 }
      })
      return true
    }

    return false
  }
)

// Smart paste: if text selected and pasting a URL, wrap as markdown link
const smartPasteExtension = EditorView.domEventHandlers({
  paste(event: ClipboardEvent, view: EditorView) {
    const { from, to } = view.state.selection.main
    if (from === to) return false // No selection

    const clipText = event.clipboardData?.getData('text/plain') || ''
    if (!clipText) return false

    // Check if pasted text looks like a URL
    if (/^https?:\/\/\S+$/.test(clipText.trim())) {
      const selected = view.state.doc.sliceString(from, to)
      event.preventDefault()
      view.dispatch({
        changes: { from, to, insert: `[${selected}](${clipText.trim()})` }
      })
      return true
    }
    return false
  }
})

// Checkbox click handler (for rendered view)
const checkboxClickExtension = EditorView.domEventHandlers({
  mousedown(event: MouseEvent, view: EditorView) {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false

    const line = view.state.doc.lineAt(pos)
    const text = line.text

    // Check if click is near a checkbox
    const uncheckedIdx = text.indexOf('[ ]')
    const checkedIdx = text.indexOf('[x]')

    if (uncheckedIdx !== -1) {
      const checkboxFrom = line.from + uncheckedIdx
      const checkboxTo = checkboxFrom + 3
      if (pos >= checkboxFrom && pos <= checkboxTo) {
        view.dispatch({
          changes: { from: checkboxFrom, to: checkboxTo, insert: '[x]' }
        })
        event.preventDefault()
        return true
      }
    }

    if (checkedIdx !== -1) {
      const checkboxFrom = line.from + checkedIdx
      const checkboxTo = checkboxFrom + 3
      if (pos >= checkboxFrom && pos <= checkboxTo) {
        view.dispatch({
          changes: { from: checkboxFrom, to: checkboxTo, insert: '[ ]' }
        })
        event.preventDefault()
        return true
      }
    }

    return false
  }
})

export const smartEditKeymap: KeyBinding[] = [
  {
    key: 'Enter',
    run: handleEnterInList
  },
  {
    key: 'Tab',
    run: (view) => handleTabInList(view, true)
  },
  {
    key: 'Shift-Tab',
    run: (view) => handleTabInList(view, false)
  },
  {
    key: 'Mod-b',
    run: toggleBold
  },
  {
    key: 'Mod-i',
    run: toggleItalic
  },
  {
    key: 'Mod-k',
    run: insertLink
  },
  {
    key: 'Mod-Shift-k',
    run: insertCodeBlock
  },
  {
    key: 'Mod-]',
    run: (view) => handleTabInList(view, true)
  },
  {
    key: 'Mod-[',
    run: (view) => handleTabInList(view, false)
  },
  {
    key: 'Mod-Enter',
    run: toggleCheckbox
  }
]

export { toggleBold, toggleItalic, toggleInlineCode, insertLink, insertCodeBlock, toggleCheckbox }
export const smartEditExtensions = [
  keymap.of(smartEditKeymap),
  closePairsInputRule,
  smartPasteExtension,
  checkboxClickExtension
]
