export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export interface LinkEntry {
  source: string
  target: string
  line: number
  context: string
}

export interface SearchResult {
  path: string
  title: string
  matches: { line: number; text: string }[]
  score: number
}
