import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const wikiLinkMark = Decoration.mark({ class: 'cm-wiki-link' })

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    let match: RegExpExecArray | null
    WIKI_LINK_RE.lastIndex = 0
    while ((match = WIKI_LINK_RE.exec(text)) !== null) {
      const start = from + match.index
      const end = start + match[0].length
      builder.add(start, end, wikiLinkMark)
    }
  }
  return builder.finish()
}

export const wikiLinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) => v.decorations
  }
)

export function wikiLinkClickHandler(
  onNavigate: (target: string) => void
): EditorView['dom']['onclick'] {
  return (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.classList.contains('cm-wiki-link')) return

    const view = (target.closest('.cm-editor') as any)?.cmView?.view as EditorView | undefined
    if (!view) return

    const pos = view.posAtDOM(target)
    const line = view.state.doc.lineAt(pos)
    const lineText = line.text

    WIKI_LINK_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = WIKI_LINK_RE.exec(lineText)) !== null) {
      const matchStart = line.from + match.index
      const matchEnd = matchStart + match[0].length
      if (pos >= matchStart && pos <= matchEnd) {
        const linkTarget = match[1].trim()
        onNavigate(linkTarget)
        event.preventDefault()
        event.stopPropagation()
        return
      }
    }
  }
}
