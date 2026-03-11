import React from 'react'

interface EditorToolbarProps {
  onAction: (action: string) => void
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onAction }) => {
  const buttons: { label: string; action: string; title: string }[] = [
    { label: 'B', action: 'bold', title: 'Bold (Ctrl+B)' },
    { label: 'I', action: 'italic', title: 'Italic (Ctrl+I)' },
    { label: '<>', action: 'code', title: 'Inline Code' },
    { label: 'H1', action: 'h1', title: 'Heading 1' },
    { label: 'H2', action: 'h2', title: 'Heading 2' },
    { label: 'H3', action: 'h3', title: 'Heading 3' },
  ]

  const buttons2: { label: string; action: string; title: string }[] = [
    { label: '\u2022', action: 'bullet', title: 'Bullet List' },
    { label: '1.', action: 'numbered', title: 'Numbered List' },
    { label: '\u2611', action: 'checkbox', title: 'Checkbox' },
    { label: '\uD83D\uDD17', action: 'link', title: 'Link (Ctrl+K)' },
    { label: '\u2015', action: 'hr', title: 'Horizontal Rule' },
    { label: '```', action: 'codeblock', title: 'Code Block (Ctrl+Shift+K)' },
  ]

  return (
    <div className="editor-toolbar">
      {buttons.map((btn) => (
        <button
          key={btn.action}
          onClick={() => onAction(btn.action)}
          title={btn.title}
          style={btn.action === 'bold' ? { fontWeight: 'bold' } : btn.action === 'italic' ? { fontStyle: 'italic' } : {}}
        >
          {btn.label}
        </button>
      ))}
      <div className="toolbar-separator" />
      {buttons2.map((btn) => (
        <button key={btn.action} onClick={() => onAction(btn.action)} title={btn.title}>
          {btn.label}
        </button>
      ))}
    </div>
  )
}
