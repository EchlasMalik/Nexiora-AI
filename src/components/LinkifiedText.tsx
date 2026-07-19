import { cn } from '@/lib/utils'

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

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
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </span>
  )
}
