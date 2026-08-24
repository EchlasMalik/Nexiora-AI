import { motion } from 'framer-motion'
import { Briefcase, Building2, HardHat, ScrollText, Users2 } from 'lucide-react'

const useCases = [
  {
    icon: Briefcase,
    title: 'Agencies',
    description:
      'Offer chatbot setup as an add-on to every website you design or manage, without building or maintaining anything yourself.',
  },
  {
    icon: Users2,
    title: 'Consultants & coaches',
    description:
      'Qualify enquiries automatically and let serious prospects book a call directly, instead of playing email tag to find a time.',
  },
  {
    icon: Building2,
    title: 'Recruitment & staffing',
    description:
      'Answer candidate and client questions instantly, and capture details from every visitor who lands on a role or landing page.',
  },
  {
    icon: HardHat,
    title: 'Local service businesses',
    description:
      'Trades, clinics, and salons can capture enquiries and book appointments outside opening hours instead of missing the call entirely.',
  },
  {
    icon: ScrollText,
    title: 'Professional services',
    description:
      'Give visitors instant answers about your services and pricing, then hand qualified leads straight to your team.',
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Built for teams that live on inbound leads
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Nexiora AI adapts to whatever your chatbot needs to know — here's where it fits best.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase, i) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
              className="rounded-2xl border border-border bg-white p-6"
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <useCase.icon className="size-5" />
              </div>
              <p className="mt-4 font-semibold text-brand-navy">{useCase.title}</p>
              <p className="mt-1.5 text-sm text-brand-text-secondary">{useCase.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
