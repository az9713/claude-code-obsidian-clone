import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Vault
  selectVault: (): Promise<string | null> => ipcRenderer.invoke('vault:select'),
  getSavedVault: (): Promise<string | null> => ipcRenderer.invoke('vault:getSaved'),
  startWatching: (vaultPath: string): Promise<boolean> => ipcRenderer.invoke('vault:startWatching', vaultPath),
  stopWatching: (): Promise<boolean> => ipcRenderer.invoke('vault:stopWatching'),

  // File operations
  openVault: (dirPath: string) => ipcRenderer.invoke('fs:openVault', dirPath),
  readNote: (filePath: string): Promise<string> => ipcRenderer.invoke('fs:readNote', filePath),
  writeNote: (filePath: string, content: string): Promise<void> => ipcRenderer.invoke('fs:writeNote', filePath, content),
  createNote: (dirPath: string, name: string): Promise<string> => ipcRenderer.invoke('fs:createNote', dirPath, name),
  deleteNote: (filePath: string): Promise<void> => ipcRenderer.invoke('fs:deleteNote', filePath),
  renameNote: (oldPath: string, newPath: string): Promise<void> => ipcRenderer.invoke('fs:renameNote', oldPath, newPath),
  moveNote: (filePath: string, newDirPath: string): Promise<string> => ipcRenderer.invoke('fs:moveNote', filePath, newDirPath),
  createFolder: (dirPath: string, name: string): Promise<string> => ipcRenderer.invoke('fs:createFolder', dirPath, name),
  copyAttachment: (sourcePath: string, vaultPath: string): Promise<string> => ipcRenderer.invoke('fs:copyAttachment', sourcePath, vaultPath),
  listAllNotes: (vaultPath: string): Promise<string[]> => ipcRenderer.invoke('fs:listAllNotes', vaultPath),

  // Links
  getBacklinks: (filePath: string) => ipcRenderer.invoke('links:getBacklinks', filePath),
  getForwardLinks: (filePath: string) => ipcRenderer.invoke('links:getForwardLinks', filePath),
  getAllLinks: () => ipcRenderer.invoke('links:getAllLinks'),
  resolveLink: (linkName: string): Promise<string | null> => ipcRenderer.invoke('links:resolveLink', linkName),
  getAllNoteNames: (): Promise<string[]> => ipcRenderer.invoke('links:getAllNoteNames'),

  // Search
  search: (query: string) => ipcRenderer.invoke('search:query', query),

  // Index
  rebuildFileIndex: (filePath: string) => ipcRenderer.invoke('index:rebuildFile', filePath),
  removeFileIndex: (filePath: string) => ipcRenderer.invoke('index:removeFile', filePath),

  // Watcher events
  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => callback(filePath)
    ipcRenderer.on('vault:file-changed', handler)
    return () => ipcRenderer.removeListener('vault:file-changed', handler)
  },
  onFileAdded: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => callback(filePath)
    ipcRenderer.on('vault:file-added', handler)
    return () => ipcRenderer.removeListener('vault:file-added', handler)
  },
  onFileRemoved: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string): void => callback(filePath)
    ipcRenderer.on('vault:file-removed', handler)
    return () => ipcRenderer.removeListener('vault:file-removed', handler)
  },

  // Shortcut events forwarded from main process (for Chromium-reserved keys)
  onShortcut: (callback: (data: { key: string; ctrl: boolean; shift: boolean; meta: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { key: string; ctrl: boolean; shift: boolean; meta: boolean }): void => callback(data)
    ipcRenderer.on('shortcut', handler)
    return () => ipcRenderer.removeListener('shortcut', handler)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
