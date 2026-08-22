import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, ExternalLink, HelpCircle, Home, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { streamChatbotReply, type ChatTurn, type GetReplyFn, type WidgetChatbot } from '@/lib/ai'
import type { SuggestedQuestion } from '@/entities'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/relativeTime'
import { LinkifiedText } from '@/components/LinkifiedText'
import { useAvoidElementOffset } from '@/hooks/useAvoidElementOffset'

export interface ChatWidgetMessage extends ChatTurn {
  id: string
  created_date: string
}

type WidgetTab = 'home' | 'messages' | 'help'

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
  /**
   * Fetches a returning visitor's prior conversation, if any. Only passed by
   * the public embeddable widget (`PublicWidgetLoader`) — omitted for the
   * dashboard's Live Preview / demo pages, which always start fresh.
   */
  getHistory?: (chatbot: WidgetChatbot) => Promise<ChatWidgetMessage[]>
  /** CSS selector of a host-page element the launcher should avoid covering on load (e.g. a hero marquee). */
  avoidSelector?: string
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

export function ChatWidget({
  chatbot,
  onClose,
  variant = 'full',
  getReply = streamChatbotReply,
  getHistory,
  avoidSelector,
}: ChatWidgetProps) {
  const [open, setOpen] = useState(variant === 'full')
  const [tab, setTab] = useState<WidgetTab>('home')
  const bottomOffset = useAvoidElementOffset(avoidSelector)
  const [messages, setMessages] = useState<ChatWidgetMessage[]>(() =>
    chatbot.welcome_message
      ? [{ id: 'welcome', role: 'assistant', content: chatbot.welcome_message, created_date: new Date().toISOString() }]
      : []
  )
  const [draft, setDraft] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyFetchedRef = useRef(false)
  const themeColor = chatbot.theme_color || '#7C3AED'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isResponding, streamingText, tab])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current)
    }
  }, [])

  // Restores a returning visitor's prior conversation the first time they
  // open the widget — fetched on open rather than on mount, so a visitor who
  // never opens it never costs an extra request.
  useEffect(() => {
    if (!open || !getHistory || historyFetchedRef.current) return
    historyFetchedRef.current = true
    let cancelled = false
    getHistory(chatbot).then((history) => {
      if (cancelled || history.length === 0) return
      // A slow fetch shouldn't stomp a message the visitor already sent
      // while it was in flight.
      setMessages((prev) => (prev.length <= 1 ? history : prev))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per open, guarded by historyFetchedRef
  }, [open])

  function handleClose() {
    setOpen(false)
    onClose?.()
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isResponding) return

    const userMessage: ChatWidgetMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      created_date: new Date().toISOString(),
    }
    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setDraft('')
    setIsResponding(true)
    setStreamingText('')
    setTab('messages')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const fullText = await getReply({
        chatbot,
        history: nextHistory,
        signal: controller.signal,
        onDelta: (chunk) => setStreamingText((prev) => prev + chunk),
      })
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: fullText, created_date: new Date().toISOString() },
      ])
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              chatbot.fallback_message || "Sorry, I'm having trouble responding right now. Please try again in a moment.",
            created_date: new Date().toISOString(),
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
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: qa.question, created_date: new Date().toISOString() },
    ])
    setIsResponding(true)
    setTab('messages')

    const thinkingDelay = 3000 + Math.random() * 2000
    thinkingTimeoutRef.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: qa.answer, created_date: new Date().toISOString() },
      ])
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
        className="fixed right-6 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition-[bottom,transform] duration-300 ease-out hover:scale-110 active:scale-95"
        style={{ backgroundColor: themeColor, bottom: bottomOffset }}
      >
        <MessageCircle className="size-6" />
      </button>
    )
  }

  const hasRealHistory = messages.some((message) => message.id !== 'welcome')
  const lastMessage = messages[messages.length - 1]
  const hasHelp = chatbot.faqs.length > 0

  const navItems: { key: WidgetTab; label: string; icon: typeof Home }[] = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'messages', label: 'Messages', icon: MessageCircle },
    ...(hasHelp ? [{ key: 'help' as const, label: 'Help', icon: HelpCircle }] : []),
  ]

  const avatar = (
    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20">
      {chatbot.avatar_url ? (
        <img src={chatbot.avatar_url} alt={chatbot.name} className="size-full object-cover" />
      ) : (
        <Sparkles className="size-4" />
      )}
    </div>
  )

  const closeButton = variant === 'embedded' && (
    <button
      onClick={handleClose}
      aria-label="Close chat"
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 active:scale-90"
    >
      <X className="size-4" />
    </button>
  )

  const gradientStyle = { backgroundImage: `linear-gradient(to right, ${themeColor}, ${shade(themeColor, -20)})` }

  const header =
    tab === 'home' ? (
      <div className="flex flex-col gap-4 px-5 pb-6 pt-5 text-white" style={gradientStyle}>
        <div className="flex items-center justify-between">
          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15">
            {chatbot.logo_url ? (
              <img src={chatbot.logo_url} alt={chatbot.name} className="size-full object-contain p-1" />
            ) : chatbot.avatar_url ? (
              <img src={chatbot.avatar_url} alt={chatbot.name} className="size-full object-cover" />
            ) : (
              <Sparkles className="size-5" />
            )}
          </div>
          {closeButton}
        </div>
        <p className="whitespace-pre-line text-xl font-semibold leading-snug">
          {chatbot.welcome_message || 'Hi there 👋\nHow can we help?'}
        </p>
      </div>
    ) : (
      <div className="flex items-center gap-3 px-5 py-4 text-white" style={gradientStyle}>
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{tab === 'help' ? 'Help' : chatbot.name}</p>
          {tab === 'messages' && (
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Online
            </p>
          )}
        </div>
        {closeButton}
      </div>
    )

  const widget = (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl',
        variant === 'embedded' ? 'h-[600px] w-[380px]' : 'h-full w-full'
      )}
    >
      {header}

      {tab === 'home' && (
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#faf9fc] px-4 py-4">
          <button
            onClick={() => setTab('messages')}
            className="w-full cursor-pointer rounded-2xl border border-border bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
          >
            {hasRealHistory && lastMessage ? (
              <>
                <p className="text-xs font-semibold text-brand-text-secondary">Recent message</p>
                <div className="mt-1.5 flex items-start gap-2.5">
                  {avatar}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-brand-navy">{chatbot.name}</p>
                      <span className="shrink-0 text-xs text-brand-text-secondary">
                        {formatRelativeTime(lastMessage.created_date)}
                      </span>
                    </div>
                    <p className="truncate text-sm text-brand-text-secondary">{lastMessage.content}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm font-medium text-brand-navy">Send us a message</p>
            )}
          </button>

          {chatbot.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
            >
              {link.label}
              <ExternalLink className="size-4 shrink-0 text-brand-text-secondary" />
            </a>
          ))}

          {hasHelp && (
            <button
              onClick={() => setTab('help')}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
            >
              Help
              <ChevronRight className="size-4 shrink-0 text-brand-text-secondary" />
            </button>
          )}
        </div>
      )}

      {tab === 'help' && (
        <div className="flex-1 space-y-2 overflow-y-auto bg-[#faf9fc] px-4 py-4">
          {chatbot.faqs.map((faq, index) => {
            const isExpanded = expandedFaqIndex === index
            return (
              <div
                key={`${faq.question}-${index}`}
                className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
              >
                <button
                  onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-brand-navy transition-colors hover:bg-slate-50"
                >
                  {faq.question}
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-brand-text-secondary transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {isExpanded && faq.answer && (
                  <p className="border-t border-border px-4 py-3 text-sm text-brand-text-secondary">{faq.answer}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'messages' && (
        <>
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
                    className="cursor-pointer rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-all hover:scale-105 hover:bg-violet-100 active:scale-95"
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
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-all enabled:hover:scale-110 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: themeColor }}
            >
              <Send className="size-4" />
            </button>
          </div>
        </>
      )}

      {chatbot.powered_by_branding && (
        <p className="border-t border-border bg-white py-1.5 text-center text-[10px] text-brand-text-secondary">
          Powered by Nexiora AI
        </p>
      )}

      <div className="flex border-t border-border bg-white">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = tab === item.key
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors hover:bg-slate-50 active:bg-slate-100"
              style={{ color: isActive ? themeColor : undefined }}
            >
              <Icon className={cn('size-5', !isActive && 'text-brand-text-secondary')} />
              <span className={cn(!isActive && 'text-brand-text-secondary')}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  if (variant === 'embedded') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="fixed right-6 z-50 transition-[bottom] duration-300 ease-out"
        style={{ bottom: bottomOffset }}
      >
        {widget}
      </motion.div>
    )
  }

  return widget
}
