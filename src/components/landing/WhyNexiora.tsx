import { motion } from 'framer-motion'
import { Languages, ShieldCheck, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
      'Every account’s conversations and knowledge base are fully isolated at the database level — nothing is ever shared across customers.',
  },
]

export function WhyNexiora() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Built to be trusted with real conversations
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            The details that matter once your chatbot is talking to real customers, not just a demo.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <reason.icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-navy">{reason.title}</p>
                    <p className="mt-1.5 text-sm text-brand-text-secondary">{reason.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
