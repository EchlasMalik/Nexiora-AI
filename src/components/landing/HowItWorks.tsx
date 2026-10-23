import { useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Bot, Code2, FileUp } from 'lucide-react'
import { CodeBlock } from '@/components/CodeBlock'
import { Reveal, SectionHeading, Accent } from './Reveal'

const steps = [
  {
    icon: Bot,
    title: 'Create your chatbot',
    description: 'Give it a name, a tone, and a personality. Takes under a minute.',
  },
  {
    icon: FileUp,
    title: 'Train it on your business',
    description: 'Upload docs, paste FAQs, or link your website — it learns instantly.',
  },
  {
    icon: Code2,
    title: 'Paste one line of code',
    description: 'Drop a single script tag on your site and you’re live. Works with any website builder.',
  },
]

export function HowItWorks() {
  // Matches the real embed snippet shown in the dashboard (EmbedTab.tsx),
  // which also derives from window.location.origin — so this marketing
  // example always shows a real, working URL regardless of which domain the
  // app is served from, rather than a hardcoded placeholder.
  const codeSnippet = `<script
  src="${window.location.origin}/widget.js"
  data-chatbot-id="your-chatbot-id"
  async
></script>`

  const stepsRef = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ['start 75%', 'end 55%'] })
  // Spring-smoothed so the line has a little weight instead of tracking the
  // scrollbar 1:1.
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 })

  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Live on your site in <Accent>three</Accent> steps
            </>
          }
          description="No developer required — most teams are live before their coffee gets cold."
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
          <ol ref={stepsRef} className="relative space-y-10">
            <span className="absolute top-2 bottom-2 left-5.5 w-px bg-slate-200" aria-hidden />
            <motion.span
              aria-hidden
              className="absolute top-2 bottom-2 left-5.5 w-px origin-top bg-violet-500"
              style={{ scaleY: progress }}
            />
            {steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 0.08} className="relative flex gap-5">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-sm shadow-violet-600/10">
                  <step.icon className="size-5" />
                </span>
                <div className="pt-1">
                  <p className="font-mono text-xs text-slate-400">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-brand-navy">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-brand-text-secondary">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.1} className="relative">
            <div className="absolute -inset-6 -z-10 rounded-4xl bg-violet-500/10 blur-2xl" />
            <CodeBlock code={codeSnippet} filename="index.html" copyable className="shadow-2xl shadow-slate-900/20" />
            <p className="mt-4 text-center text-sm text-brand-text-secondary">
              Works anywhere you can add a script tag — WordPress, Webflow, Shopify &amp; more.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
