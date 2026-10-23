import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatPreview } from './ChatPreview'
import { Accent } from './Reveal'

const trustPoints = ['14-day free trial', 'No credit card', 'Live in minutes']

// The hero entrance is a CSS animation rather than framer-motion: it runs off
// the main thread, so it stays smooth while the rest of the app hydrates.
const stagger = (step: number) => ({ animationDelay: `${80 + step * 70}ms` })

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-28 pb-20 sm:pt-32 lg:pt-40 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-[100px]" />
        <div className="absolute top-64 -right-32 size-80 rounded-full bg-fuchsia-400/15 blur-[90px]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <div
            className="animate-enter inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/70 py-1 pr-3.5 pl-1.5 text-sm text-brand-text-secondary shadow-sm shadow-violet-500/5 backdrop-blur"
            style={stagger(0)}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-semibold text-white">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" />
                <span className="relative size-1.5 rounded-full bg-white" />
              </span>
              Live
            </span>
            Answers, captures leads &amp; books calls
          </div>

          <h1
            className="animate-enter mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-brand-navy sm:text-6xl lg:text-[4.25rem]"
            style={stagger(1)}
          >
            The AI chatbot that converts visitors into <Accent className="pr-1">customers</Accent>
          </h1>

          <p
            className="animate-enter mx-auto mt-6 max-w-lg text-lg leading-relaxed text-pretty text-brand-text-secondary lg:mx-0"
            style={stagger(2)}
          >
            Nexiora AI learns your business, replies instantly in any language, and hands you qualified
            leads and booked meetings — while you sleep.
          </p>

          <div
            className="animate-enter mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            style={stagger(3)}
          >
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group h-12 w-full gap-2 rounded-full px-7 text-[15px] shadow-lg shadow-violet-600/25 sm:w-auto"
              >
                Start your free trial
                <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full bg-white/70 px-7 text-[15px] backdrop-blur hover:bg-white hover:text-brand-navy sm:w-auto"
              >
                See how it works
              </Button>
            </a>
          </div>

          <ul
            className="animate-enter mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start"
            style={stagger(4)}
          >
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-1.5 text-sm text-brand-text-secondary">
                <span className="flex size-4 items-center justify-center rounded-full bg-violet-100">
                  <Check className="size-2.5 text-violet-700" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="animate-enter" style={{ animationDelay: '260ms', animationDuration: '900ms' }}>
          <ChatPreview />
        </div>
      </div>
    </section>
  )
}
