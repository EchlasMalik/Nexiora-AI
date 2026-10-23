import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion'
import { Sparkles, CalendarCheck, UserRoundCheck, SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE_OUT } from './easing'

interface ChatMessage {
  role: 'assistant' | 'user'
  text: string
}

const MESSAGES: ChatMessage[] = [
  { role: 'assistant', text: "Hi \u{1F44B} I'm Aria. What brings you here today?" },
  { role: 'user', text: 'Do you build websites for dental clinics?' },
  { role: 'assistant', text: 'We do — 20+ clinics so far. Want me to send over some examples? What’s your email?' },
  { role: 'user', text: 'sam@brightsmile.co' },
  { role: 'assistant', text: 'Sent! I’ve also booked you a 15-min call for tomorrow at 2:00 PM.' },
]

const LEAD_AT = 3
const BOOKED_AT = 4

const TYPING_MS = 1100
const READ_MS = 1500
const LOOP_PAUSE_MS = 3200

const SPRING = { type: 'spring', duration: 0.5, bounce: 0.2 } as const

export function ChatPreview() {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  // No point running timers for a demo nobody can see.
  const inView = useInView(rootRef, { margin: '-10% 0px' })

  const [visibleCount, setVisibleCount] = useState(reduceMotion ? MESSAGES.length : 0)
  const [typingRole, setTypingRole] = useState<'assistant' | 'user' | null>(null)

  useEffect(() => {
    if (reduceMotion) {
      setVisibleCount(MESSAGES.length)
      return
    }
    if (!inView) return

    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, ms: number) => {
      timeouts.push(
        setTimeout(() => {
          if (!cancelled) fn()
        }, ms)
      )
    }

    function runStep(index: number) {
      if (index >= MESSAGES.length) {
        schedule(() => {
          setVisibleCount(0)
          schedule(() => runStep(0), 400)
        }, LOOP_PAUSE_MS)
        return
      }
      setTypingRole(MESSAGES[index].role)
      schedule(() => {
        setTypingRole(null)
        setVisibleCount(index + 1)
        schedule(() => runStep(index + 1), READ_MS)
      }, TYPING_MS)
    }

    setVisibleCount(0)
    setTypingRole(null)
    schedule(() => runStep(0), 300)

    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [inView, reduceMotion])

  const visibleMessages = MESSAGES.slice(0, visibleCount)
  const leadCaptured = visibleCount > LEAD_AT
  const appointmentBooked = visibleCount > BOOKED_AT

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-88 sm:max-w-sm">
      <div className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-linear-to-b from-violet-500/20 via-fuchsia-400/10 to-transparent blur-2xl" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_-20px_rgba(76,29,149,0.35),0_0_0_1px_rgba(15,23,42,0.02)]">
        <div className="flex items-center gap-3 bg-linear-to-br from-violet-600 to-violet-800 px-5 py-4 text-white">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Sparkles className="size-4" />
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-violet-700 bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Aria · BrightWeb Studio</p>
            <p className="h-4 text-xs text-white/75">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={typingRole === 'assistant' ? 'typing' : 'online'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {typingRole === 'assistant' ? 'Typing…' : 'Replies instantly'}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </div>

        <div className="flex h-84 flex-col justify-end gap-2.5 overflow-hidden bg-linear-to-b from-slate-50/80 to-white px-4 pt-4 pb-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleMessages.map((message, i) => {
              const isUser = message.role === 'user'
              return (
                <motion.div
                  key={i}
                  layout="position"
                  // Bubbles grow out of their tail corner, not their centre.
                  style={{ transformOrigin: isUser ? 'bottom right' : 'bottom left' }}
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className={cn(
                    'max-w-[85%] px-3.5 py-2.5 text-[13.5px] leading-snug',
                    isUser
                      ? 'ml-auto rounded-2xl rounded-br-md bg-violet-600 text-white'
                      : 'rounded-2xl rounded-bl-md border border-slate-200/70 bg-white text-brand-navy shadow-sm shadow-slate-900/5'
                  )}
                >
                  {message.text}
                </motion.div>
              )
            })}
            {typingRole && (
              <motion.div
                key="typing"
                layout="position"
                style={{ transformOrigin: typingRole === 'user' ? 'bottom right' : 'bottom left' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className={cn(
                  'flex w-fit gap-1 rounded-2xl px-3.5 py-3',
                  typingRole === 'user'
                    ? 'ml-auto rounded-br-md bg-violet-600'
                    : 'rounded-bl-md border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5'
                )}
              >
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className={cn('size-1.5 rounded-full', typingRole === 'user' ? 'bg-white/80' : 'bg-slate-400')}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
          <span className="flex-1 text-sm text-slate-400">Type a message…</span>
          <span className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white">
            <SendHorizontal className="size-3.5" />
          </span>
        </div>
      </div>

      <AnimatePresence>
        {leadCaptured && (
          <motion.div
            key="lead"
            style={{ transformOrigin: 'right center' }}
            initial={{ opacity: 0, scale: 0.9, x: 12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={SPRING}
            className="absolute top-24 -left-3 flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 py-2 pr-3.5 pl-2 shadow-xl shadow-slate-900/10 backdrop-blur sm:-left-14"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserRoundCheck className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-semibold text-brand-navy">New lead</span>
              <span className="block text-[11px] text-brand-text-secondary">sam@brightsmile.co</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appointmentBooked && (
          <motion.div
            key="appointment"
            style={{ transformOrigin: 'left center' }}
            initial={{ opacity: 0, scale: 0.9, x: -12 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={SPRING}
            className="absolute -right-3 bottom-24 flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/95 py-2 pr-3.5 pl-2 shadow-xl shadow-slate-900/10 backdrop-blur sm:-right-12"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CalendarCheck className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-semibold text-brand-navy">Call booked</span>
              <span className="block text-[11px] text-brand-text-secondary">Tomorrow · 2:00 PM</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
