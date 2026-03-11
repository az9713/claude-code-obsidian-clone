import { create } from 'zustand'
import { FileNode, LinkEntry, SearchResult } from '../lib/types'

interface VaultState {
  vaultPath: string | null
  fileTree: FileNode | null
  activeFile: string | null
  activeContent: string
  backlinks: LinkEntry[]
  searchResults: SearchResult[]
  searchQuery: string
  showSearch: boolean
  showGraph: boolean
  sidebarVisible: boolean
  rightPanelVisible: boolean
  noteNames: string[]

  setVaultPath: (path: string | null) => void
  setFileTree: (tree: FileNode | null) => void
  setActiveFile: (path: string | null) => void
  setActiveContent: (content: string) => void
  setBacklinks: (links: LinkEntry[]) => void
  setSearchResults: (results: SearchResult[]) => void
  setSearchQuery: (query: string) => void
  toggleSearch: () => void
  toggleGraph: () => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setNoteNames: (names: string[]) => void
}

export const useVaultStore = create<VaultState>((set) => ({
  vaultPath: null,
  fileTree: null,
  activeFile: null,
  activeContent: '',
  backlinks: [],
  searchResults: [],
  searchQuery: '',
  showSearch: false,
  showGraph: false,
  sidebarVisible: true,
  rightPanelVisible: true,
  noteNames: [],

  setVaultPath: (path) => set({ vaultPath: path }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setActiveFile: (path) => set({ activeFile: path }),
  setActiveContent: (content) => set({ activeContent: content }),
  setBacklinks: (links) => set({ backlinks: links }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),
  toggleGraph: () => set((s) => ({ showGraph: !s.showGraph })),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleRightPanel: () => set((s) => ({ rightPanelVisible: !s.rightPanelVisible })),
  setNoteNames: (names) => set({ noteNames: names })
}))
