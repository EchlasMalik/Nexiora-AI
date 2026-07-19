import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { streamChatbotReply, type ChatTurn, type GetReplyFn, type WidgetChatbot } from '@/lib/ai'
import type { SuggestedQuestion } from '@/entities'
import { cn } from '@/lib/utils'
import { LinkifiedText } from '@/components/LinkifiedText'

interface ChatWidgetMessage extends ChatTurn {
  id: string
}

interface ChatWidgetProps {
  chatbot: WidgetChatbot
  onClose?: () => void
  variant?: 'full' | 'embedded'
  /**
   * Defaults to the authenticated `streamChatbotReply` (dashboard Live
   * Preview / demo pages). The public embeddable widget passes
   * `streamPublicChatbotReply` instead, since anonymous visitors have no
   * Supabase session to call chat-completion with.
   */
  getReply?: GetReplyFn
}

/** Darkens (negative percent) or lightens (positive) a hex color, e.g. for gradient shading. */
function shade(hex: string, percent: number): string {
  const cleaned = hex.replace('#', '')
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned
  const num = parseInt(normalized || '2563eb', 16)
  const amt = Math.round(2.55 * percent)
  const channel = (shift: number) => Math.min(255, Math.max(0, ((num >> shift) & 0xff) + amt))
  const r = channel(16)
  const g = channel(8)
  const b = channel(0)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function ChatWidget({ chatbot, onClose, variant = 'full', getReply = streamChatbotReply }: ChatWidgetProps) {
  const [open, setOpen] = useState(variant === 'full')
  const [messages, setMessages] = useState<ChatWidgetMessage[]>(() =>
    chatbot.welcome_message ? [{ id: 'welcome', role: 'assistant', content: chatbot.welcome_message }] : []
  )
  const [draft, setDraft] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const themeColor = chatbot.theme_color || '#7C3AED'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isResponding, streamingText])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
    }
  }, [])

  function handleClose() {
    setOpen(false)
    onClose?.()
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isResponding) return

    const userMessage: ChatWidgetMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setDraft('')
    setIsResponding(true)
    setStreamingText('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const fullText = await getReply({
        chatbot,
        history: nextHistory,
        signal: controller.signal,
        onDelta: (chunk) => setStreamingText((prev) => prev + chunk),
      })
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: fullText }])
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              chatbot.fallback_message || "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          },
        ])
      }
    } finally {
      setIsResponding(false)
      setStreamingText('')
      abortRef.current = null
    }
  }

  function handleSuggestedQuestion(qa: SuggestedQuestion) {
    if (isResponding) return
    if (!qa.answer.trim()) {
      sendMessage(qa.question)
      return
    }

    // A fixed answer is set, so there's no real AI call to wait on — but
    // popping it in instantly reads as robotic. A short "typing" beat
    // (reusing the same indicator as a real streamed reply) makes it feel
    // like a natural response instead of a canned one.
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: qa.question }])
    setIsResponding(true)

    const thinkingDelay = 3000 + Math.random() * 2000
    thinkingTimeoutRef.current = setTimeout(() => {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: qa.answer }])
      setIsResponding(false)
      thinkingTimeoutRef.current = null
    }, thinkingDelay)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage(draft)
    }
  }

  if (variant === 'embedded' && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Chat with ${chatbot.name}`}
        className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105"
        style={{ backgroundColor: themeColor }}
      >
        <MessageCircle className="size-6" />
      </button>
    )
  }

  const widget = (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl',
        variant === 'embedded' ? 'h-[560px] w-[360px]' : 'h-full w-full'
      )}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 text-white"
        style={{ backgroundImage: `linear-gradient(to right, ${themeColor}, ${shade(themeColor, -20)})` }}
      >
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
          {chatbot.avatar_url ? (
            <img src={chatbot.avatar_url} alt={chatbot.name} className="size-full object-cover" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{chatbot.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-white/80">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Online
          </p>
        </div>
        {variant === 'embedded' && (
          <button
            onClick={handleClose}
            aria-label="Close chat"
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/15"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf9fc] px-4 py-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                message.role === 'user'
                  ? 'ml-auto rounded-br-md text-white'
                  : 'rounded-bl-md bg-white text-brand-navy shadow-sm'
              )}
              style={message.role === 'user' ? { backgroundColor: themeColor } : undefined}
            >
              <LinkifiedText text={message.content} />
            </motion.div>
          ))}

          {isResponding && !streamingText && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm"
            >
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-1.5 rounded-full bg-slate-400"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: dot * 0.15 }}
                />
              ))}
            </motion.div>
          )}

          {streamingText && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-brand-navy shadow-sm"
            >
              <LinkifiedText text={streamingText} />
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length <= 1 && chatbot.suggested_questions?.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {chatbot.suggested_questions.map((qa) => (
              <button
                key={qa.question}
                onClick={() => handleSuggestedQuestion(qa)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
              >
                {qa.question}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message…"
          className="h-10 flex-1 rounded-full bg-muted px-4 text-sm text-brand-navy outline-none placeholder:text-brand-text-secondary focus:ring-2 focus:ring-violet-300"
        />
        <button
          onClick={() => sendMessage(draft)}
          disabled={!draft.trim() || isResponding}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: themeColor }}
        >
          <Send className="size-4" />
        </button>
      </div>

      {chatbot.powered_by_branding && (
        <p className="border-t border-border bg-white py-1.5 text-center text-[10px] text-brand-text-secondary">
          Powered by Nexiora AI
        </p>
      )}
    </div>
  )

  if (variant === 'embedded') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="fixed right-6 bottom-6 z-50"
      >
        {widget}
      </motion.div>
    )
  }

  return widget
}
