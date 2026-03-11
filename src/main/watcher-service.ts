import chokidar from 'chokidar'
import { BrowserWindow } from 'electron'
import * as path from 'path'

export class WatcherService {
  private watcher: chokidar.FSWatcher
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(vaultPath: string, mainWindow: BrowserWindow) {
    this.watcher = chokidar.watch(vaultPath, {
      ignored: /(^|[/\\])\./,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    })

    const debounce = (event: string, filePath: string): void => {
      const key = `${event}:${filePath}`
      const existing = this.debounceTimers.get(key)
      if (existing) clearTimeout(existing)
      this.debounceTimers.set(key, setTimeout(() => {
        this.debounceTimers.delete(key)
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`vault:${event}`, filePath)
        }
      }, 100))
    }

    this.watcher
      .on('change', (filePath) => debounce('file-changed', filePath))
      .on('add', (filePath) => debounce('file-added', filePath))
      .on('unlink', (filePath) => debounce('file-removed', filePath))
      .on('addDir', (dirPath) => debounce('file-added', dirPath))
      .on('unlinkDir', (dirPath) => debounce('file-removed', dirPath))
  }

  close(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
    this.watcher.close()
  }
}
