import { ipcMain } from 'electron'
import { FileService } from './file-service'
import { LinkIndex } from './link-index'
import { SearchService } from './search-service'

const linkIndex = new LinkIndex()
const searchService = new SearchService()

export function registerIpcHandlers(): void {
  // File operations
  ipcMain.handle('fs:openVault', async (_e, dirPath: string) => {
    const tree = await FileService.openVault(dirPath)
    const notes = await FileService.listAllNotes(dirPath)
    linkIndex.buildIndex(dirPath, notes)
    searchService.buildIndex(dirPath, notes)
    return tree
  })

  ipcMain.handle('fs:readNote', async (_e, filePath: string) => {
    return FileService.readNote(filePath)
  })

  ipcMain.handle('fs:writeNote', async (_e, filePath: string, content: string) => {
    await FileService.writeNote(filePath, content)
    linkIndex.parseFileLinks(filePath)
    searchService.updateNote(filePath)
  })

  ipcMain.handle('fs:createNote', async (_e, dirPath: string, name: string) => {
    const filePath = await FileService.createNote(dirPath, name)
    linkIndex.updateNoteRegistry(filePath)
    searchService.updateNote(filePath)
    return filePath
  })

  ipcMain.handle('fs:deleteNote', async (_e, filePath: string) => {
    await FileService.deleteNote(filePath)
    linkIndex.removeNote(filePath)
    searchService.removeNote(filePath)
  })

  ipcMain.handle('fs:renameNote', async (_e, oldPath: string, newPath: string) => {
    await FileService.renameNote(oldPath, newPath)
    linkIndex.removeNote(oldPath)
    linkIndex.updateNoteRegistry(newPath)
    linkIndex.parseFileLinks(newPath)
    searchService.removeNote(oldPath)
    searchService.updateNote(newPath)
  })

  ipcMain.handle('fs:moveNote', async (_e, filePath: string, newDirPath: string) => {
    const newPath = await FileService.moveNote(filePath, newDirPath)
    linkIndex.removeNote(filePath)
    linkIndex.updateNoteRegistry(newPath)
    linkIndex.parseFileLinks(newPath)
    searchService.removeNote(filePath)
    searchService.updateNote(newPath)
    return newPath
  })

  ipcMain.handle('fs:createFolder', async (_e, dirPath: string, name: string) => {
    return FileService.createFolder(dirPath, name)
  })

  ipcMain.handle('fs:copyAttachment', async (_e, sourcePath: string, vaultPath: string) => {
    return FileService.copyAttachment(sourcePath, vaultPath)
  })

  ipcMain.handle('fs:listAllNotes', async (_e, vaultPath: string) => {
    return FileService.listAllNotes(vaultPath)
  })

  // Links
  ipcMain.handle('links:getBacklinks', (_e, filePath: string) => {
    return linkIndex.getBacklinks(filePath)
  })

  ipcMain.handle('links:getForwardLinks', (_e, filePath: string) => {
    return linkIndex.getForwardLinks(filePath)
  })

  ipcMain.handle('links:getAllLinks', () => {
    return linkIndex.getAllLinks()
  })

  ipcMain.handle('links:resolveLink', (_e, linkName: string) => {
    return linkIndex.resolveLink(linkName)
  })

  ipcMain.handle('links:getAllNoteNames', () => {
    return linkIndex.getAllNoteNames()
  })

  // Search
  ipcMain.handle('search:query', (_e, query: string) => {
    return searchService.search(query)
  })

  // Rebuild indexes (called when vault watcher detects changes)
  ipcMain.handle('index:rebuildFile', (_e, filePath: string) => {
    linkIndex.updateNoteRegistry(filePath)
    linkIndex.parseFileLinks(filePath)
    searchService.updateNote(filePath)
  })

  ipcMain.handle('index:removeFile', (_e, filePath: string) => {
    linkIndex.removeNote(filePath)
    searchService.removeNote(filePath)
  })
}
