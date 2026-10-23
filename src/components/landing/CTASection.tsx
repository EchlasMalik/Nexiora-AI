import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'

export function CTASection() {
  return (
    <section className="px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-4xl bg-brand-navy px-6 py-16 text-center text-white shadow-2xl shadow-violet-950/30 sm:px-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="bg-grid-light absolute inset-0" />
          <div className="absolute -bottom-32 left-1/2 h-72 w-160 -translate-x-1/2 rounded-full bg-violet-600/50 blur-[100px]" />
        </div>

        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
          Your next customer is on your site{' '}
          <span className="font-serif font-normal tracking-normal text-violet-300 italic">right now</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-pretty text-slate-300">
          Give them someone to talk to. Start your free trial — live on your site in minutes, no credit card
          required.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/register"
            className="pressable group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-brand-navy shadow-lg shadow-black/20 hover:bg-violet-50"
          >
            Start your free trial
            <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#pricing"
            className="pressable inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-slate-300 hover:text-white"
          >
            Compare plans
          </a>
        </div>
      </Reveal>
    </section>
  )
}
