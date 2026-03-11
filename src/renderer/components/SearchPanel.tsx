import React, { useState, useEffect, useRef, useCallback } from 'react'
import { SearchResult } from '../lib/types'

interface SearchPanelProps {
  onClose: () => void
  onOpenNote: (filePath: string) => void
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onClose, onOpenNote }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    const r = await window.api.search(q)
    setResults(r)
    setSelectedIndex(0)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      onOpenNote(results[selectedIndex].path)
      onClose()
    }
  }

  const highlightMatch = (text: string, q: string): React.ReactNode => {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="search-panel" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search notes..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <div className="search-results">
          {results.map((result, i) => (
            <div
              key={result.path}
              className={`search-result-item ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => {
                onOpenNote(result.path)
                onClose()
              }}
            >
              <div className="search-result-title">{result.title}</div>
              {result.matches.slice(0, 2).map((m, j) => (
                <div key={j} className="search-result-match">
                  {highlightMatch(m.text, query)}
                </div>
              ))}
            </div>
          ))}
          {query && results.length === 0 && (
            <div className="no-backlinks">No results found</div>
          )}
        </div>
      </div>
    </div>
  )
}
