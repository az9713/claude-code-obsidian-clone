import * as fs from 'fs'
import * as path from 'path'
import { LinkEntry } from './types'

const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

export class LinkIndex {
  private forwardLinks: Map<string, string[]> = new Map()
  private backLinks: Map<string, LinkEntry[]> = new Map()
  private notesByName: Map<string, string> = new Map()

  buildIndex(vaultPath: string, notePaths: string[]): void {
    this.forwardLinks.clear()
    this.backLinks.clear()
    this.notesByName.clear()

    // Build name -> path map
    for (const notePath of notePaths) {
      const name = path.basename(notePath, '.md').toLowerCase()
      const existing = this.notesByName.get(name)
      // Shortest path wins on collision
      if (!existing || notePath.length < existing.length) {
        this.notesByName.set(name, notePath)
      }
    }

    // Parse links
    for (const notePath of notePaths) {
      this.parseFileLinks(notePath)
    }
  }

  parseFileLinks(filePath: string): void {
    let content: string
    try {
      content = fs.readFileSync(filePath, 'utf-8')
    } catch {
      return
    }

    // Clear old entries
    const oldTargets = this.forwardLinks.get(filePath) || []
    for (const target of oldTargets) {
      const entries = this.backLinks.get(target) || []
      this.backLinks.set(target, entries.filter(e => e.source !== filePath))
    }

    const lines = content.split('\n')
    const targets: string[] = []

    for (let i = 0; i < lines.length; i++) {
      let match: RegExpExecArray | null
      WIKI_LINK_REGEX.lastIndex = 0
      while ((match = WIKI_LINK_REGEX.exec(lines[i])) !== null) {
        const targetName = match[1].trim().toLowerCase()
        const targetPath = this.notesByName.get(targetName)

        if (targetPath && targetPath !== filePath) {
          targets.push(targetPath)
          const entry: LinkEntry = {
            source: filePath,
            target: targetPath,
            line: i + 1,
            context: lines[i].trim()
          }
          const existing = this.backLinks.get(targetPath) || []
          existing.push(entry)
          this.backLinks.set(targetPath, existing)
        } else if (!targetPath) {
          // Track unresolved link target name
          targets.push(targetName)
        }
      }
    }

    this.forwardLinks.set(filePath, targets)
  }

  updateNoteRegistry(filePath: string): void {
    const name = path.basename(filePath, '.md').toLowerCase()
    this.notesByName.set(name, filePath)
  }

  removeNote(filePath: string): void {
    const name = path.basename(filePath, '.md').toLowerCase()
    if (this.notesByName.get(name) === filePath) {
      this.notesByName.delete(name)
    }
    this.forwardLinks.delete(filePath)
    this.backLinks.delete(filePath)
    // Remove as source from others' backlinks
    for (const [target, entries] of this.backLinks) {
      this.backLinks.set(target, entries.filter(e => e.source !== filePath))
    }
  }

  getBacklinks(filePath: string): LinkEntry[] {
    return this.backLinks.get(filePath) || []
  }

  getForwardLinks(filePath: string): string[] {
    return this.forwardLinks.get(filePath) || []
  }

  getAllLinks(): { source: string; target: string }[] {
    const links: { source: string; target: string }[] = []
    for (const [source, targets] of this.forwardLinks) {
      for (const target of targets) {
        if (this.notesByName.has(path.basename(target, '.md').toLowerCase()) || fs.existsSync(target)) {
          links.push({ source, target })
        }
      }
    }
    return links
  }

  resolveLink(linkName: string): string | null {
    return this.notesByName.get(linkName.toLowerCase()) || null
  }

  getAllNoteNames(): string[] {
    return Array.from(this.notesByName.keys())
  }
}
