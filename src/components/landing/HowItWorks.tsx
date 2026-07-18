import { motion } from 'framer-motion'
import { CodeBlock } from '@/components/CodeBlock'

const steps = [
  {
    number: '01',
    title: 'Create your chatbot',
    description: 'Give it a name, tone, and personality in under a minute.',
  },
  {
    number: '02',
    title: 'Train on your data',
    description: 'Upload docs, paste FAQs, or link your website — Aria learns instantly.',
  },
  {
    number: '03',
    title: 'Embed one line of code',
    description: 'Drop a single script tag on your site and you’re live.',
  },
]

const codeSnippet = `<script
  src="https://cdn.nexiora.ai/widget.js"
  data-chatbot-id="your-chatbot-id"
  async
></script>`

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Live in three steps
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            No developer required — most teams are live before their coffee gets cold.
          </p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-violet-600 to-violet-800 text-sm font-semibold text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-brand-navy">{step.title}</h3>
                  <p className="mt-1 text-sm text-brand-text-secondary">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <CodeBlock code={codeSnippet} filename="index.html" className="shadow-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
