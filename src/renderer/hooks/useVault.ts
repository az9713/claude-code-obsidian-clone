import { useCallback, useEffect } from 'react'
import { useVaultStore } from '../store/vault-store'

export function useVault() {
  const store = useVaultStore()

  const loadVault = useCallback(async (vaultPath: string) => {
    store.setVaultPath(vaultPath)
    const tree = await window.api.openVault(vaultPath)
    store.setFileTree(tree)
    await window.api.startWatching(vaultPath)

    const names = await window.api.getAllNoteNames()
    store.setNoteNames(names)
  }, [])

  const openNote = useCallback(async (filePath: string) => {
    const content = await window.api.readNote(filePath)
    store.setActiveFile(filePath)
    store.setActiveContent(content)

    const backlinks = await window.api.getBacklinks(filePath)
    store.setBacklinks(backlinks)
  }, [])

  const saveNote = useCallback(async (filePath: string, content: string) => {
    await window.api.writeNote(filePath, content)
  }, [])

  const refreshVault = useCallback(async () => {
    if (!store.vaultPath) return
    const tree = await window.api.openVault(store.vaultPath)
    store.setFileTree(tree)
    const names = await window.api.getAllNoteNames()
    store.setNoteNames(names)
  }, [store.vaultPath])

  const navigateToLink = useCallback(async (linkName: string) => {
    // If it's already a full path (from graph view), open directly
    if (linkName.includes('/') || linkName.includes('\\')) {
      const filePath = linkName.endsWith('.md') ? linkName : linkName + '.md'
      await openNote(filePath)
      return
    }

    let resolved = await window.api.resolveLink(linkName)
    if (!resolved && store.vaultPath) {
      // Create the note in Notes/ subfolder
      const notesDir = store.vaultPath + '/Notes'
      try {
        resolved = await window.api.createNote(notesDir, linkName)
      } catch {
        // File might already exist but not indexed yet — try opening directly
        resolved = notesDir + '/' + linkName + '.md'
      }
      await refreshVault()
    }
    if (resolved) {
      await openNote(resolved)
    }
  }, [store.vaultPath, openNote, refreshVault])

  // Set up file watcher listeners
  useEffect(() => {
    const unsubChanged = window.api.onFileChanged(async (filePath: string) => {
      if (filePath === store.activeFile) {
        const content = await window.api.readNote(filePath)
        store.setActiveContent(content)
      }
      await window.api.rebuildFileIndex(filePath)
    })

    const unsubAdded = window.api.onFileAdded(async () => {
      await refreshVault()
    })

    const unsubRemoved = window.api.onFileRemoved(async (filePath: string) => {
      if (filePath === store.activeFile) {
        store.setActiveFile(null)
        store.setActiveContent('')
      }
      await window.api.removeFileIndex(filePath)
      await refreshVault()
    })

    return () => {
      unsubChanged()
      unsubAdded()
      unsubRemoved()
    }
  }, [store.activeFile, refreshVault])

  return {
    loadVault,
    openNote,
    saveNote,
    refreshVault,
    navigateToLink
  }
}
