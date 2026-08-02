import { cn } from '@/lib/utils'

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

// A reply often ends a sentence right after a URL with no space before the
// punctuation (e.g. "book here: https://example.com.") — the greedy match
// above would swallow that into the link itself and break it, so strip
// trailing sentence punctuation off the match and render it as plain text.
const TRAILING_PUNCTUATION_PATTERN = /[.,!?;:'"]+$/

/**
 * Renders message text with paragraphs preserved and bare URLs turned into
 * real clickable links — used anywhere raw chatbot/visitor message content
 * is displayed (the embeddable widget, dashboard Live Preview, and the
 * dashboard's Conversations inbox), so all three read the same message the
 * same way.
 *
 * Splitting on a capturing group interleaves matched URLs into the result
 * at odd indices — checked by position rather than re-testing the
 * (stateful, /g-flagged) regex against each part.
 */
export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {parts.map((part, i) => {
        if (i % 2 !== 1) return part
        const trailing = part.match(TRAILING_PUNCTUATION_PATTERN)?.[0] ?? ''
        const url = trailing ? part.slice(0, -trailing.length) : part
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80">
              {url}
            </a>
            {trailing}
          </span>
        )
      })}
    </span>
  )
}
