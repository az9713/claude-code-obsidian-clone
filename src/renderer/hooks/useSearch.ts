import { useCallback } from 'react'
import { useVaultStore } from '../store/vault-store'

export function useSearch() {
  const setSearchResults = useVaultStore((s) => s.setSearchResults)
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery)

  const search = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const results = await window.api.search(query)
    setSearchResults(results)
  }, [setSearchResults, setSearchQuery])

  return { search }
}
