import { useCallback } from 'react'
import { useVaultStore } from '../store/vault-store'

export function useLinks() {
  const setBacklinks = useVaultStore((s) => s.setBacklinks)

  const refreshBacklinks = useCallback(async (filePath: string) => {
    const backlinks = await window.api.getBacklinks(filePath)
    setBacklinks(backlinks)
  }, [setBacklinks])

  return { refreshBacklinks }
}
