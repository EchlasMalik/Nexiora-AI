import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Briefcase, Building2, HardHat, ScrollText, Sparkles, Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal, SectionHeading, Accent } from './Reveal'
import { EASE_OUT } from './easing'

const useCases = [
  {
    icon: Briefcase,
    title: 'Agencies',
    description:
      'Offer chatbot setup as an add-on to every website you design or manage, without building or maintaining anything yourself.',
    question: 'Can you redesign our site and add online booking?',
    answer: 'Absolutely — we’ve done that for several clients. Want me to set up a free 20-min scoping call?',
    outcome: 'Scoping call booked',
  },
  {
    icon: Users2,
    title: 'Consultants & coaches',
    description:
      'Qualify enquiries automatically and let serious prospects book a call directly, instead of playing email tag to find a time.',
    question: 'Do you work with first-time founders?',
    answer: 'Yes, that’s most of my clients. What stage is your business at right now?',
    outcome: 'Lead qualified',
  },
  {
    icon: Building2,
    title: 'Recruitment & staffing',
    description:
      'Answer candidate and client questions instantly, and capture details from every visitor who lands on a role or landing page.',
    question: 'Is the Senior Designer role open to remote applicants?',
    answer: 'It’s hybrid — two days a week in London. Shall I send you the full spec by email?',
    outcome: 'Candidate captured',
  },
  {
    icon: HardHat,
    title: 'Local services',
    description:
      'Trades, clinics, and salons capture enquiries and book appointments outside opening hours instead of missing the call entirely.',
    question: 'Any appointments free on Saturday morning?',
    answer: 'There’s a 10:30 slot open with Emma. Would you like me to book it for you?',
    outcome: 'Appointment booked',
  },
  {
    icon: ScrollText,
    title: 'Professional services',
    description:
      'Give visitors instant answers about your services and pricing, then hand qualified leads straight to your team.',
    question: 'How much do you charge for annual accounts?',
    answer: 'Annual accounts start from £450 for sole traders. I can pass your details to a partner for a quote.',
    outcome: 'Handed to your team',
  },
]

export function UseCases() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = useCases[activeIndex]

  return (
    <section id="use-cases" className="scroll-mt-20 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Use cases"
          title={
            <>
              Built for teams that live on <Accent>inbound</Accent> leads
            </>
          }
          description="Your chatbot adapts to whatever your business needs it to know. Here’s where it fits best."
        />

        <Reveal delay={0.08} className="mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10">
          <div role="tablist" aria-label="Industries" className="flex flex-col gap-1.5">
            {useCases.map((useCase, i) => {
              const selected = i === activeIndex
              return (
                <button
                  key={useCase.title}
                  role="tab"
                  aria-selected={selected}
                  aria-controls="use-case-panel"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'pressable relative isolate rounded-2xl px-5 py-4 text-left',
                    selected ? '' : 'hover:bg-white/70'
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="use-case-active"
                      className="absolute inset-0 -z-10 rounded-2xl border border-border/80 bg-white shadow-sm shadow-slate-900/5"
                      transition={{ type: 'spring', duration: 0.45, bounce: 0.1 }}
                    />
                  )}
                  <span className="flex items-center gap-3">
                    <useCase.icon
                      className={cn('size-4.5 transition-colors', selected ? 'text-violet-600' : 'text-slate-400')}
                    />
                    <span className={cn('font-semibold', selected ? 'text-brand-navy' : 'text-slate-600')}>
                      {useCase.title}
                    </span>
                  </span>
                  {/* Description only for the active row — keeps the list scannable. */}
                  <AnimatePresence initial={false}>
                    {selected && (
                      <motion.span
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: EASE_OUT }}
                        className="block overflow-hidden pl-7.5 text-sm leading-relaxed text-brand-text-secondary"
                      >
                        <span className="block pt-1.5">{useCase.description}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>

          <div
            id="use-case-panel"
            role="tabpanel"
            className="relative flex min-h-88 flex-col justify-center overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-white to-violet-50/60 p-6 sm:p-10"
          >
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Example conversation</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeIndex}
                // Blur bridges the crossfade so it reads as one panel changing,
                // not two panels swapping.
                initial={{ opacity: 0, filter: 'blur(4px)', transform: 'translateY(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }}
                exit={{ opacity: 0, filter: 'blur(4px)', transform: 'translateY(-4px)' }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="mt-6 flex flex-col gap-3"
              >
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm text-white">
                  {active.question}
                </div>
                <div className="flex max-w-[90%] items-end gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                    <Sparkles className="size-3.5" />
                  </span>
                  <div className="rounded-2xl rounded-bl-md border border-border/70 bg-white px-4 py-3 text-sm text-brand-navy shadow-sm shadow-slate-900/5">
                    {active.answer}
                  </div>
                </div>
                <span className="mt-3 inline-flex w-fit items-center gap-1.5 self-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {active.outcome}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
