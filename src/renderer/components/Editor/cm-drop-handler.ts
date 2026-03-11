import { EditorView } from '@codemirror/view'

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']
const PDF_EXT = '.pdf'

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase()
}

export function createDropHandler(
  getVaultPath: () => string | null
) {
  return EditorView.domEventHandlers({
    drop(event: DragEvent, view: EditorView) {
      const vaultPath = getVaultPath()
      if (!vaultPath) return false

      // Handle dropped files
      const files = event.dataTransfer?.files
      if (files && files.length > 0) {
        event.preventDefault()
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) return true

        Array.from(files).forEach(async (file) => {
          const filePath = (file as any).path as string
          if (!filePath) return

          const ext = getFileExtension(filePath)
          const fileName = filePath.split(/[/\\]/).pop() || 'file'

          if (IMAGE_EXTS.includes(ext)) {
            // Copy to Attachments and insert embed
            const savedName = await window.api.copyAttachment(filePath, vaultPath)
            const insert = `![[${savedName}]]`
            view.dispatch({
              changes: { from: pos, to: pos, insert }
            })
          } else if (ext === PDF_EXT) {
            const savedName = await window.api.copyAttachment(filePath, vaultPath)
            const insert = `![[${savedName}]]`
            view.dispatch({
              changes: { from: pos, to: pos, insert }
            })
          } else if (ext === '.md') {
            // Insert wiki link
            const noteName = fileName.replace('.md', '')
            const insert = `[[${noteName}]]`
            view.dispatch({
              changes: { from: pos, to: pos, insert }
            })
          }
        })
        return true
      }

      // Handle dropped text/URLs
      const text = event.dataTransfer?.getData('text/plain')
      if (text && /^https?:\/\/\S+$/.test(text.trim())) {
        event.preventDefault()
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos === null) return true

        const insert = `[link](${text.trim()})`
        view.dispatch({
          changes: { from: pos, to: pos, insert }
        })
        return true
      }

      return false
    },
    dragover(event: DragEvent) {
      // Allow dropping
      event.preventDefault()
      return false
    }
  })
}
