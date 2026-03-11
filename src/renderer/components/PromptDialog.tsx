import React, { useState, useEffect, useRef } from 'react'

interface PromptDialogProps {
  message: string
  defaultValue?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

export const PromptDialog: React.FC<PromptDialogProps> = ({
  message,
  defaultValue = '',
  onSubmit,
  onCancel
}) => {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus and select on mount
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      e.stopPropagation()
      onSubmit(value.trim())
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div className="quick-open-overlay" onClick={onCancel}>
      <div className="quick-open-dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--fg)' }}>
            {message}
          </div>
          <input
            ref={inputRef}
            style={{ width: '100%', fontSize: '15px', padding: '8px 12px' }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name..."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={onCancel}
              style={{ padding: '6px 16px', borderRadius: 'var(--radius)', color: 'var(--fg-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => value.trim() && onSubmit(value.trim())}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius)',
                background: 'var(--accent)',
                color: 'var(--bg)',
                fontWeight: 600
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
