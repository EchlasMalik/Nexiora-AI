import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  Clock,
  FileText,
  Globe,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal, SectionHeading, Accent } from './Reveal'
import { EASE_OUT } from './easing'

function Tile({
  icon: Icon,
  title,
  description,
  visual,
  className,
  delay = 0,
}: {
  icon: typeof Clock
  title: string
  description: string
  visual: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <Reveal delay={delay} className={cn('h-full', className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-white shadow-sm shadow-slate-900/3">
        <div className="relative flex min-h-48 flex-1 items-center justify-center overflow-hidden border-b border-border/60 bg-linear-to-b from-slate-50 to-white p-6">
          {visual}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-violet-600" />
            <h3 className="font-semibold text-brand-navy">{title}</h3>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-text-secondary">{description}</p>
        </div>
      </article>
    </Reveal>
  )
}

const inView = { once: true, margin: '-60px' } as const

function AlwaysOnVisual() {
  const events = [
    { time: '02:14', label: 'Pricing question answered', tone: 'bg-sky-50 text-sky-700' },
    { time: '06:47', label: 'Demo call booked', tone: 'bg-violet-50 text-violet-700' },
    { time: '23:31', label: 'New lead captured', tone: 'bg-emerald-50 text-emerald-700' },
  ]
  return (
    <ul className="w-full max-w-sm space-y-2.5">
      {events.map((e, i) => (
        <motion.li
          key={e.time}
          initial={{ opacity: 0, transform: 'translateX(-12px)' }}
          whileInView={{ opacity: 1, transform: 'translateX(0px)' }}
          viewport={inView}
          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: EASE_OUT }}
          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm shadow-slate-900/4"
        >
          <span className="font-mono text-xs text-slate-400 tabular-nums">{e.time}</span>
          <span className="flex-1 truncate text-sm font-medium text-brand-navy">{e.label}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', e.tone)}>Aria</span>
        </motion.li>
      ))}
    </ul>
  )
}

function LeadVisual() {
  const fields = [
    ['Name', 'Priya Shah'],
    ['Email', 'priya@northlane.io'],
    ['Need', 'Website redesign'],
  ]
  return (
    <div className="w-full max-w-60 rounded-2xl border border-border/70 bg-white p-4 shadow-sm shadow-slate-900/4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-brand-navy">New contact</span>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={inView}
          transition={{ type: 'spring', duration: 0.5, bounce: 0.3, delay: 0.5 }}
          className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
        >
          <Check className="size-3" strokeWidth={3} /> Qualified
        </motion.span>
      </div>
      <dl className="mt-3 space-y-2">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="text-slate-400">{k}</dt>
            <dd className="truncate font-medium text-brand-navy">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function BookingVisual() {
  const slots = ['9:00', '10:30', '13:00', '14:00', '15:30', '16:15']
  return (
    <div className="grid w-full max-w-60 grid-cols-3 gap-2">
      {slots.map((slot) => {
        const picked = slot === '14:00'
        return (
          <motion.span
            key={slot}
            initial={false}
            whileInView={picked ? { backgroundColor: '#7c3aed', color: '#ffffff', borderColor: '#7c3aed' } : undefined}
            viewport={inView}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="flex h-9 items-center justify-center rounded-xl border border-border/80 bg-white text-xs font-medium text-brand-navy tabular-nums"
          >
            {slot}
          </motion.span>
        )
      })}
    </div>
  )
}

function KnowledgeVisual() {
  const sources = [
    { icon: FileText, label: 'pricing.pdf' },
    { icon: Globe, label: 'yoursite.com/services' },
    { icon: BookOpen, label: 'FAQs' },
  ]
  return (
    <div className="flex w-full max-w-md items-center gap-4 sm:gap-6">
      <ul className="flex-1 space-y-2">
        {sources.map(({ icon: Icon, label }, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, transform: 'translateX(-10px)' }}
            whileInView={{ opacity: 1, transform: 'translateX(0px)' }}
            viewport={inView}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: EASE_OUT }}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-white px-3 py-2 text-xs font-medium text-brand-navy shadow-sm shadow-slate-900/4"
          >
            <Icon className="size-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{label}</span>
          </motion.li>
        ))}
      </ul>
      <ArrowRight className="size-4 shrink-0 text-slate-300" />
      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-violet-800 text-white shadow-lg shadow-violet-600/30">
        <Sparkles className="size-6" />
      </div>
    </div>
  )
}

function AnalyticsVisual() {
  const bars = [38, 52, 44, 66, 58, 80, 92]
  return (
    <div className="flex h-28 w-full max-w-60 items-end gap-2">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          style={{ height: `${h}%`, transformOrigin: 'bottom' }}
          initial={{ transform: 'scaleY(0.15)', opacity: 0.4 }}
          whileInView={{ transform: 'scaleY(1)', opacity: 1 }}
          viewport={inView}
          transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE_OUT }}
          className={cn('flex-1 rounded-md', i === bars.length - 1 ? 'bg-violet-600' : 'bg-violet-200')}
        />
      ))}
    </div>
  )
}

function HandoffVisual() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-violet-700">
        <Sparkles className="size-4.5" />
      </span>
      <div className="relative h-px w-16 overflow-hidden bg-slate-200 sm:w-24">
        <motion.span
          className="absolute inset-y-0 left-0 w-full bg-violet-500"
          style={{ transformOrigin: 'left' }}
          initial={{ transform: 'scaleX(0)' }}
          whileInView={{ transform: 'scaleX(1)' }}
          viewport={inView}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.77, 0, 0.175, 1] }}
        />
      </div>
      <span className="flex items-center gap-2 rounded-full border border-border/70 bg-white py-1.5 pr-3.5 pl-1.5 shadow-sm shadow-slate-900/4">
        <span className="flex size-7 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
          S
        </span>
        <span className="text-xs font-medium text-brand-navy">Sarah joined</span>
      </span>
    </div>
  )
}

export function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-20 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Features"
          title={
            <>
              Everything you need to turn chats into <Accent>revenue</Accent>
            </>
          }
          description="One assistant that answers, qualifies, and books — so your team only talks to people ready to buy."
        />

        <div className="mt-16 grid gap-5 md:grid-cols-6">
          <Tile
            className="md:col-span-4"
            icon={Clock}
            title="24/7 AI conversations"
            description="Your chatbot never clocks off — answering questions and qualifying leads around the clock."
            visual={<AlwaysOnVisual />}
          />
          <Tile
            className="md:col-span-2"
            delay={0.06}
            icon={UserPlus}
            title="Lead capture"
            description="Names, emails, and requirements collected naturally in every conversation."
            visual={<LeadVisual />}
          />
          <Tile
            className="md:col-span-2"
            icon={CalendarCheck}
            title="Smart booking"
            description="Visitors book a meeting straight from the chat — no email tennis."
            visual={<BookingVisual />}
          />
          <Tile
            className="md:col-span-4"
            delay={0.06}
            icon={BookOpen}
            title="Trained on your knowledge"
            description="Upload docs, paste FAQs, or point it at your website. Answers come from your content — not guesses."
            visual={<KnowledgeVisual />}
          />
          <Tile
            className="md:col-span-3"
            icon={BarChart3}
            title="Analytics"
            description="Track conversations, leads, and appointments across every chatbot you run."
            visual={<AnalyticsVisual />}
          />
          <Tile
            className="md:col-span-3"
            delay={0.06}
            icon={Users}
            title="Human handoff"
            description="Pass tricky conversations to your team without the visitor repeating themselves."
            visual={<HandoffVisual />}
          />
        </div>
      </div>
    </section>
  )
}
