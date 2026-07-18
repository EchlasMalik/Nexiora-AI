import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CheckCircle2, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  role: 'assistant' | 'user'
  text: string
}

const MESSAGES: ChatMessage[] = [
  { role: 'assistant', text: "Hi \u{1F44B} I'm Aria from Nexiora AI. What brings you here today?" },
  { role: 'user', text: "Hey! I need a chatbot for my agency's website." },
  { role: 'assistant', text: 'I can help with that — mind sharing your email so I can send a quick demo?' },
  { role: 'user', text: "Sure, it's echlas@nexioratalent.com" },
  { role: 'assistant', text: "Perfect — I've booked you a 15-min walkthrough for tomorrow at 2:00 PM." },
]

const TYPING_MS = 1100
const READ_MS = 1600
const LOOP_PAUSE_MS = 3000

export function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [typingRole, setTypingRole] = useState<'assistant' | 'user' | null>(null)
  const [leadCaptured, setLeadCaptured] = useState(false)
  const [appointmentBooked, setAppointmentBooked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timeouts.push(id)
    }

    function runStep(index: number) {
      if (cancelled) return
      if (index >= MESSAGES.length) {
        schedule(() => {
          setVisibleCount(0)
          setLeadCaptured(false)
          setAppointmentBooked(false)
          runStep(0)
        }, LOOP_PAUSE_MS)
        return
      }
      setTypingRole(MESSAGES[index].role)
      schedule(() => {
        setTypingRole(null)
        setVisibleCount(index + 1)
        if (index === 1) setLeadCaptured(true)
        if (index === 4) setAppointmentBooked(true)
        schedule(() => runStep(index + 1), READ_MS)
      }, TYPING_MS)
    }

    runStep(0)

    return () => {
      cancelled = true
      timeouts.forEach(clearTimeout)
    }
  }, [])

  const visibleMessages = MESSAGES.slice(0, visibleCount)

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-10 -z-10">
        <div className="absolute left-2 top-2 size-40 rounded-full bg-violet-400/30 blur-3xl" />
        <div className="absolute bottom-2 right-2 size-48 rounded-full bg-violet-700/20 blur-3xl" />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-linear-to-r from-violet-600 to-violet-800 px-5 py-4 text-white">
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Aria</p>
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Online
            </p>
          </div>
        </div>

        <div className="flex h-80 flex-col justify-end gap-3 overflow-hidden px-4 py-4">
          <AnimatePresence initial={false}>
            {visibleMessages.map((message, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-linear-to-r from-violet-600 to-violet-800 px-4 py-2.5 text-sm text-white'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-brand-navy'
                }
              >
                {message.text}
              </motion.div>
            ))}
            {typingRole && (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={
                  typingRole === 'user'
                    ? 'ml-auto flex w-fit gap-1 rounded-2xl rounded-br-sm bg-linear-to-r from-violet-600 to-violet-800 px-4 py-3'
                    : 'flex w-fit gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3'
                }
              >
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className={cn(
                      'size-1.5 rounded-full',
                      typingRole === 'user' ? 'bg-white/70' : 'bg-slate-400'
                    )}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {leadCaptured && (
          <motion.div
            key="lead"
            initial={{ opacity: 0, x: -16, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute -left-8 top-20 flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 shadow-lg"
          >
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span className="text-xs font-medium text-brand-navy">Lead captured</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appointmentBooked && (
          <motion.div
            key="appointment"
            initial={{ opacity: 0, x: 16, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute -right-8 bottom-16 flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 shadow-lg"
          >
            <CalendarCheck className="size-4 text-violet-600" />
            <span className="text-xs font-medium text-brand-navy">Appointment booked</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
