import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-linear-to-r from-violet-600 to-violet-800 px-8 py-16 text-center text-white shadow-xl sm:px-16"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-10 size-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -right-10 size-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Ready to put your chatbot to work?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-violet-100">
            Start your free trial today — no credit card required, live on your site in minutes.
          </p>
          <Link to="/register">
            <button className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-slate-100">
              Start your free trial <ArrowRight className="size-4" />
            </button>
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
