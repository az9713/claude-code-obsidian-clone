import { CompletionContext, CompletionResult, autocompletion } from '@codemirror/autocomplete'

export function wikiLinkAutocomplete(getNoteNames: () => string[]) {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // Look back for [[ trigger
        const line = context.state.doc.lineAt(context.pos)
        const textBefore = line.text.slice(0, context.pos - line.from)

        const lastOpen = textBefore.lastIndexOf('[[')
        if (lastOpen === -1) return null

        // Make sure we're not inside a closed ]]
        const afterOpen = textBefore.slice(lastOpen + 2)
        if (afterOpen.includes(']]')) return null

        const query = afterOpen.toLowerCase()
        const from = line.from + lastOpen + 2

        const names = getNoteNames()
        const options = names
          .filter(name => name.toLowerCase().includes(query))
          .slice(0, 20)
          .map(name => ({
            label: name,
            apply: `${name}]]`,
            type: 'text' as const
          }))

        if (options.length === 0) return null

        return {
          from,
          options,
          filter: false
        }
      }
    ]
  })
}
