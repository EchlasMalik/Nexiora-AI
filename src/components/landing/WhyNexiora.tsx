import { Languages, ShieldCheck, Sparkles } from 'lucide-react'
import { Reveal, SectionHeading, Accent } from './Reveal'

const reasons = [
  {
    icon: Sparkles,
    title: 'Grounded in your own content',
    description:
      'Every answer is retrieved from the documents and FAQs you upload — not guessed. If it doesn’t know, it says so instead of making something up.',
  },
  {
    icon: Languages,
    title: 'Speaks your visitor’s language',
    description:
      'No configuration needed — your chatbot automatically replies in whatever language a visitor writes in.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    description:
      'Every account’s conversations and knowledge base are isolated at the database level — nothing is ever shared across customers.',
  },
]

export function WhyNexiora() {
  return (
    <section className="relative isolate overflow-hidden bg-brand-dark-bg py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid-light absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-80 w-3xl -translate-x-1/2 rounded-full bg-violet-600/30 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          tone="dark"
          eyebrow="Why Nexiora"
          title={
            <>
              Built to be trusted with <Accent className="text-violet-300">real</Accent> conversations
            </>
          }
          description="The details that matter once your chatbot is talking to real customers, not just a demo."
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 lg:grid-cols-3">
          {reasons.map((reason, i) => (
            <Reveal key={reason.title} delay={i * 0.08} className="bg-slate-950/80 p-8 backdrop-blur">
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
                <reason.icon className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-white">{reason.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{reason.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
