import * as fs from 'fs'
import * as path from 'path'
import { shell } from 'electron'
import { FileNode } from './types'

export class FileService {
  static async openVault(dirPath: string): Promise<FileNode> {
    return FileService.buildTree(dirPath, dirPath)
  }

  private static buildTree(currentPath: string, rootPath: string): FileNode {
    const name = path.basename(currentPath)
    const stat = fs.statSync(currentPath)

    if (stat.isDirectory()) {
      const children = fs.readdirSync(currentPath)
        .filter(f => !f.startsWith('.'))
        .map(child => FileService.buildTree(path.join(currentPath, child), rootPath))
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === 'directory' ? -1 : 1
        })
      return { name, path: currentPath, type: 'directory', children }
    }

    return { name, path: currentPath, type: 'file' }
  }

  static async readNote(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8')
  }

  static async writeNote(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  static async createNote(dirPath: string, name: string): Promise<string> {
    const fileName = name.endsWith('.md') ? name : `${name}.md`
    const filePath = path.join(dirPath, fileName)
    if (fs.existsSync(filePath)) {
      throw new Error(`File already exists: ${filePath}`)
    }
    fs.writeFileSync(filePath, '', 'utf-8')
    return filePath
  }

  static async deleteNote(filePath: string): Promise<void> {
    try {
      await shell.trashItem(filePath)
    } catch {
      fs.unlinkSync(filePath)
    }
  }

  static async renameNote(oldPath: string, newPath: string): Promise<void> {
    fs.renameSync(oldPath, newPath)
  }

  static async moveNote(filePath: string, newDirPath: string): Promise<string> {
    const fileName = path.basename(filePath)
    const newPath = path.join(newDirPath, fileName)
    fs.renameSync(filePath, newPath)
    return newPath
  }

  static async createFolder(dirPath: string, name: string): Promise<string> {
    const folderPath = path.join(dirPath, name)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true })
    }
    return folderPath
  }

  static async copyAttachment(sourcePath: string, vaultPath: string): Promise<string> {
    const attachDir = path.join(vaultPath, 'Attachments')
    if (!fs.existsSync(attachDir)) {
      fs.mkdirSync(attachDir, { recursive: true })
    }
    const fileName = path.basename(sourcePath)
    let destPath = path.join(attachDir, fileName)
    // Handle name collision
    if (fs.existsSync(destPath)) {
      const ext = path.extname(fileName)
      const base = path.basename(fileName, ext)
      destPath = path.join(attachDir, `${base}-${Date.now()}${ext}`)
    }
    fs.copyFileSync(sourcePath, destPath)
    return path.basename(destPath)
  }

  static async listAllNotes(vaultPath: string): Promise<string[]> {
    const notes: string[] = []
    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir)
      for (const entry of entries) {
        if (entry.startsWith('.')) continue
        const full = path.join(dir, entry)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) {
          walk(full)
        } else if (entry.endsWith('.md')) {
          notes.push(full)
        }
      }
    }
    walk(vaultPath)
    return notes
  }
}
