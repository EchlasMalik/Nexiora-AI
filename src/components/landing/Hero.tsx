import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, PlayCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatPreview } from './ChatPreview'

const trustPoints = ['No credit card required', 'Live on your site in minutes', 'Cancel anytime']

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="absolute -right-24 top-40 size-72 rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-brand-text-secondary shadow-sm"
          >
            <Sparkles className="size-4 text-violet-600" />
            AI-powered customer conversations
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl font-bold tracking-tight text-balance text-brand-navy sm:text-6xl lg:text-7xl"
          >
            The chatbot that{' '}
            <span className="bg-linear-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">
              converts visitors into customers
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-lg text-lg text-brand-text-secondary sm:text-xl"
          >
            Nexiora AI answers questions, captures leads, and books meetings — trained on your
            business and live on your site in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link to="/register">
              <Button size="lg" className="gap-2">
                Start free trial <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="gap-2">
                <PlayCircle className="size-4" />
                See how it works
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {trustPoints.map((point) => (
              <div key={point} className="flex items-center gap-1.5 text-sm text-brand-text-secondary">
                <Check className="size-4 shrink-0 text-violet-600" />
                {point}
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChatPreview />
        </motion.div>
      </div>
    </section>
  )
}
