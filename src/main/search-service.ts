import MiniSearch from 'minisearch'
import * as fs from 'fs'
import * as path from 'path'
import { SearchResult } from './types'

export class SearchService {
  private miniSearch: MiniSearch
  private vaultPath: string = ''

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'body'],
      storeFields: ['title', 'path'],
      searchOptions: {
        boost: { title: 2 },
        prefix: true,
        fuzzy: 0.2
      }
    })
  }

  buildIndex(vaultPath: string, notePaths: string[]): void {
    this.vaultPath = vaultPath
    this.miniSearch.removeAll()

    const docs = notePaths.map(notePath => {
      let body = ''
      try {
        body = fs.readFileSync(notePath, 'utf-8')
      } catch { /* ignore */ }
      return {
        id: notePath,
        title: path.basename(notePath, '.md'),
        path: notePath,
        body
      }
    })

    this.miniSearch.addAll(docs)
  }

  updateNote(filePath: string): void {
    try {
      this.miniSearch.discard(filePath)
    } catch { /* not in index */ }

    let body = ''
    try {
      body = fs.readFileSync(filePath, 'utf-8')
    } catch { return }

    this.miniSearch.add({
      id: filePath,
      title: path.basename(filePath, '.md'),
      path: filePath,
      body
    })
  }

  removeNote(filePath: string): void {
    try {
      this.miniSearch.discard(filePath)
    } catch { /* not in index */ }
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return []

    const results = this.miniSearch.search(query, { prefix: true, fuzzy: 0.2 })
    return results.slice(0, 20).map(r => {
      let content = ''
      try {
        content = fs.readFileSync(r.id, 'utf-8')
      } catch { /* ignore */ }

      const lines = content.split('\n')
      const queryLower = query.toLowerCase()
      const matchLines: { line: number; text: string }[] = []

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          matchLines.push({ line: i + 1, text: lines[i].trim() })
          if (matchLines.length >= 3) break
        }
      }

      return {
        path: r.id,
        title: path.basename(r.id, '.md'),
        matches: matchLines,
        score: r.score
      }
    })
  }
}
