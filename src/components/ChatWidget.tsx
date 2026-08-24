import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Home,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { streamChatbotReply, type ChatTurn, type GetReplyFn, type WidgetChatbot } from '@/lib/ai'
import { bookAppointment } from '@/lib/publicBooking'
import { captureLead } from '@/lib/publicLead'
import type { SuggestedQuestion } from '@/entities'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/relativeTime'
import { LinkifiedText } from '@/components/LinkifiedText'
import { useAvoidElementOffset } from '@/hooks/useAvoidElementOffset'

export interface ChatWidgetMessage extends ChatTurn {
  id: string
  created_date: string
}

type WidgetTab = 'home' | 'messages' | 'help' | 'book' | 'lead'
type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

// Proactive nudge shown near the collapsed launcher a few seconds after a
// visitor lands on the page — a short, fixed teaser distinct from
// `welcome_message` (which can be long/specific and is meant to be read
// inside the chat, not squeezed into a small floating bubble).
const GREETING_TEXT = '👋 How can we help you?'
const GREETING_DELAY_MS = 2000
const GREETING_AUTO_HIDE_MS = 10000
const GREETING_SESSION_KEY = 'nexiora:widget_greeting_shown'

// While the widget is open, an operator can take over a conversation from
// the dashboard inbox and reply directly — those rows land straight in the
// `messages` table with no way to push them to this anonymous visitor tab.
// Polling `getHistory` is the same low-effort read the "returning visitor"
// restore already uses, just repeated, so an operator's reply shows up
// without the visitor having to refresh the page.
const HISTORY_POLL_MS = 5000

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
  const [bookName, setBookName] = useState('')
  const [bookEmail, setBookEmail] = useState('')
  const [bookPhone, setBookPhone] = useState('')
  const [bookScheduledAt, setBookScheduledAt] = useState('')
  const [bookNotes, setBookNotes] = useState('')
  const [bookStatus, setBookStatus] = useState<FormStatus>('idle')
  const [bookError, setBookError] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadEmail, setLeadEmail] = useState('')
  const [leadPhone, setLeadPhone] = useState('')
  const [leadMessage, setLeadMessage] = useState('')
  const [leadStatus, setLeadStatus] = useState<FormStatus>('idle')
  const [leadError, setLeadError] = useState('')
  const [showGreeting, setShowGreeting] = useState(false)
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

  // Proactive greeting bubble: once per browser tab session (not every page
  // navigation on the same visit), a few seconds after landing — only for
  // the real embedded widget, never the dashboard's Live Preview.
  useEffect(() => {
    if (variant !== 'embedded' || sessionStorage.getItem(GREETING_SESSION_KEY)) return
    const showTimer = setTimeout(() => {
      setShowGreeting(true)
      sessionStorage.setItem(GREETING_SESSION_KEY, '1')
    }, GREETING_DELAY_MS)
    return () => clearTimeout(showTimer)
  }, [variant])

  useEffect(() => {
    if (!showGreeting) return
    const hideTimer = setTimeout(() => setShowGreeting(false), GREETING_AUTO_HIDE_MS)
    return () => clearTimeout(hideTimer)
  }, [showGreeting])

  // Restores a returning visitor's prior conversation each time they open the
  // widget (not on mount, so a visitor who never opens it never costs an
  // extra request) — re-armed on close so reopening later picks up anything
  // an operator sent while the widget was shut.
  useEffect(() => {
    if (!open) {
      historyFetchedRef.current = false
      return
    }
    if (!getHistory || historyFetchedRef.current) return
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

  // Keeps a conversation the visitor already has open in sync with an
  // operator replying live from the dashboard inbox — merges in any message
  // from the server that isn't already shown locally (matched by role +
  // content, since a message sent from this tab has a client-generated id
  // that never matches the row's real database id).
  useEffect(() => {
    if (!open || !getHistory) return
    const interval = setInterval(async () => {
      const history = await getHistory(chatbot)
      if (history.length === 0) return
      setMessages((prev) => {
        const known = new Set(prev.map((m) => `${m.role}:${m.content}`))
        const fresh = history.filter((m) => !known.has(`${m.role}:${m.content}`))
        return fresh.length > 0 ? [...prev, ...fresh] : prev
      })
    }, HISTORY_POLL_MS)
    return () => clearInterval(interval)
  }, [open, getHistory, chatbot])

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

  async function handleBookAppointment(e: FormEvent) {
    e.preventDefault()
    if (!bookName.trim() || !bookEmail.trim() || !bookScheduledAt || bookStatus === 'submitting') return

    setBookStatus('submitting')
    setBookError('')

    const result = await bookAppointment({
      chatbotId: chatbot.id,
      contactName: bookName.trim(),
      contactEmail: bookEmail.trim(),
      contactPhone: bookPhone.trim(),
      scheduledAt: new Date(bookScheduledAt).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: bookNotes.trim(),
    })

    if (result.ok) {
      setBookStatus('success')
    } else {
      setBookStatus('error')
      setBookError(result.error)
    }
  }

  function resetBookingForm() {
    setBookName('')
    setBookEmail('')
    setBookPhone('')
    setBookScheduledAt('')
    setBookNotes('')
    setBookStatus('idle')
    setBookError('')
    setTab('home')
  }

  async function handleCaptureLead(e: FormEvent) {
    e.preventDefault()
    if (!leadName.trim() || (!leadEmail.trim() && !leadPhone.trim()) || leadStatus === 'submitting') return

    setLeadStatus('submitting')
    setLeadError('')

    const result = await captureLead({
      chatbotId: chatbot.id,
      name: leadName.trim(),
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
      requirements: leadMessage.trim(),
    })

    if (result.ok) {
      setLeadStatus('success')
    } else {
      setLeadStatus('error')
      setLeadError(result.error)
    }
  }

  function resetLeadForm() {
    setLeadName('')
    setLeadEmail('')
    setLeadPhone('')
    setLeadMessage('')
    setLeadStatus('idle')
    setLeadError('')
    setTab('home')
  }

  if (variant === 'embedded' && !open) {
    return (
      <div
        className="fixed right-6 z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300 ease-out"
        style={{ bottom: bottomOffset }}
      >
        <AnimatePresence>
          {showGreeting && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(true)}
              className="relative max-w-[220px] cursor-pointer rounded-2xl bg-white py-3 pr-8 pl-4 text-sm font-medium text-brand-navy shadow-xl"
            >
              {GREETING_TEXT}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowGreeting(false)
                }}
                aria-label="Dismiss"
                className="absolute right-1.5 top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full text-brand-text-secondary hover:bg-slate-100"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen(true)}
          aria-label={`Chat with ${chatbot.name}`}
          className="flex size-14 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition-transform duration-300 ease-out hover:scale-110 active:scale-95"
          style={{ backgroundColor: themeColor }}
        >
          <MessageCircle className="size-6" />
        </button>
      </div>
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
          <p className="truncate text-sm font-semibold leading-tight">
            {tab === 'help'
              ? 'Help'
              : tab === 'book'
                ? 'Book an appointment'
                : tab === 'lead'
                  ? 'Leave your details'
                  : chatbot.name}
          </p>
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
        variant === 'embedded' ? 'h-[600px] w-[380px] max-w-[calc(100vw-2rem)]' : 'h-full w-full'
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

          {chatbot.accepts_appointments && (
            <button
              onClick={() => setTab('book')}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
            >
              Book an appointment
              <ChevronRight className="size-4 shrink-0 text-brand-text-secondary" />
            </button>
          )}

          {chatbot.accepts_lead_capture && (
            <button
              onClick={() => setTab('lead')}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-left text-sm font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
            >
              Leave your details
              <ChevronRight className="size-4 shrink-0 text-brand-text-secondary" />
            </button>
          )}

          {chatbot.booking_url && (
            <a
              href={chatbot.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md active:translate-y-0 active:shadow-sm"
            >
              Schedule externally
              <ExternalLink className="size-4 shrink-0 text-brand-text-secondary" />
            </a>
          )}

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

      {tab === 'book' && (
        <div className="flex-1 overflow-y-auto bg-[#faf9fc] px-4 py-4">
          {bookStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="size-6" />
              </div>
              <p className="text-sm font-medium text-brand-navy">You're booked!</p>
              <p className="text-sm text-brand-text-secondary">
                {bookEmail
                  ? "We'll send a confirmation to your email once it's reviewed."
                  : 'The team will be in touch to confirm.'}
              </p>
              <button
                onClick={resetBookingForm}
                className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: themeColor }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookAppointment} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="book-name" className="text-xs font-medium text-brand-text-secondary">
                  Name
                </label>
                <input
                  id="book-name"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="book-email" className="text-xs font-medium text-brand-text-secondary">
                  Email
                </label>
                <input
                  id="book-email"
                  type="email"
                  value={bookEmail}
                  onChange={(e) => setBookEmail(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="book-phone" className="text-xs font-medium text-brand-text-secondary">
                  Phone (optional)
                </label>
                <input
                  id="book-phone"
                  type="tel"
                  value={bookPhone}
                  onChange={(e) => setBookPhone(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="book-datetime" className="text-xs font-medium text-brand-text-secondary">
                  Preferred date &amp; time
                </label>
                <input
                  id="book-datetime"
                  type="datetime-local"
                  value={bookScheduledAt}
                  onChange={(e) => setBookScheduledAt(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="book-notes" className="text-xs font-medium text-brand-text-secondary">
                  What's this about? (optional)
                </label>
                <textarea
                  id="book-notes"
                  rows={3}
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {bookStatus === 'error' && <p className="text-sm text-destructive">{bookError}</p>}

              <button
                type="submit"
                disabled={!bookName.trim() || !bookEmail.trim() || !bookScheduledAt || bookStatus === 'submitting'}
                className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: themeColor }}
              >
                {bookStatus === 'submitting' ? 'Booking…' : 'Book appointment'}
              </button>
            </form>
          )}
        </div>
      )}

      {tab === 'lead' && (
        <div className="flex-1 overflow-y-auto bg-[#faf9fc] px-4 py-4">
          {leadStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="size-6" />
              </div>
              <p className="text-sm font-medium text-brand-navy">Thanks!</p>
              <p className="text-sm text-brand-text-secondary">We've got your details and will be in touch.</p>
              <button
                onClick={resetLeadForm}
                className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: themeColor }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleCaptureLead} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-name" className="text-xs font-medium text-brand-text-secondary">
                  Name
                </label>
                <input
                  id="lead-name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  required
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-email" className="text-xs font-medium text-brand-text-secondary">
                  Email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-phone" className="text-xs font-medium text-brand-text-secondary">
                  Phone
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <p className="text-xs text-brand-text-secondary">Leave at least an email or a phone number.</p>
              <div className="flex flex-col gap-1">
                <label htmlFor="lead-message" className="text-xs font-medium text-brand-text-secondary">
                  What can we help with? (optional)
                </label>
                <textarea
                  id="lead-message"
                  rows={3}
                  value={leadMessage}
                  onChange={(e) => setLeadMessage(e.target.value)}
                  className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {leadStatus === 'error' && <p className="text-sm text-destructive">{leadError}</p>}

              <button
                type="submit"
                disabled={!leadName.trim() || (!leadEmail.trim() && !leadPhone.trim()) || leadStatus === 'submitting'}
                className="cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium text-white transition-all enabled:hover:scale-[1.02] enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: themeColor }}
              >
                {leadStatus === 'submitting' ? 'Sending…' : 'Send'}
              </button>
            </form>
          )}
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

      {chatbot.powered_by_branding && (
        <p className="border-t border-border bg-white py-1.5 text-center text-[10px] text-brand-text-secondary">
          Powered by{' '}
          <a
            href="https://nexiora-ai.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-brand-navy hover:underline"
          >
            Nexiora AI
          </a>
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
        className="fixed left-1/2 z-50 -translate-x-1/2 transition-[bottom] duration-300 ease-out sm:left-auto sm:right-6 sm:translate-x-0"
        style={{ bottom: bottomOffset }}
      >
        {widget}
      </motion.div>
    )
  }

  return widget
}
