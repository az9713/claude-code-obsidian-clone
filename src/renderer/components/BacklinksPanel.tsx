import React from 'react'
import { LinkEntry } from '../lib/types'
import path from 'path'

interface BacklinksPanelProps {
  backlinks: LinkEntry[]
  onNavigate: (filePath: string) => void
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ backlinks, onNavigate }) => {
  if (backlinks.length === 0) {
    return <div className="no-backlinks">No backlinks</div>
  }

  // Group by source
  const grouped = backlinks.reduce((acc, link) => {
    if (!acc[link.source]) acc[link.source] = []
    acc[link.source].push(link)
    return acc
  }, {} as Record<string, LinkEntry[]>)

  return (
    <div>
      {Object.entries(grouped).map(([source, links]) => {
        const sourceName = source.split(/[/\\]/).pop()?.replace('.md', '') || source
        return (
          <div key={source} className="backlink-group">
            <div className="backlink-source" onClick={() => onNavigate(source)}>
              {sourceName}
            </div>
            {links.map((link, i) => (
              <div key={i} className="backlink-context">
                {link.context}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
