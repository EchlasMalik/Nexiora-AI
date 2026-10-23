import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

import { EASE_OUT } from './easing'

// Shared by every landing section so scroll reveals feel like one system:
// same curve, same distance, same viewport trigger.
export function Reveal({
  children,
  delay = 0,
  className,
  as = 'div',
}: {
  children: ReactNode
  delay?: number
  className?: string
  as?: 'div' | 'li'
}) {
  const Comp = as === 'li' ? motion.li : motion.div
  return (
    <Comp
      // Full transform strings stay hardware-accelerated; x/y shorthands don't.
      initial={{ opacity: 0, transform: 'translateY(16px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </Comp>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: 'center' | 'left'
  tone?: 'light' | 'dark'
  className?: string
}) {
  const dark = tone === 'dark'
  return (
    <Reveal className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl', className)}>
      <p
        className={cn(
          'text-sm font-semibold tracking-wide',
          dark ? 'text-violet-300' : 'text-violet-600'
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          'mt-3 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]',
          dark ? 'text-white' : 'text-brand-navy'
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-lg text-pretty',
            dark ? 'text-slate-400' : 'text-brand-text-secondary'
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  )
}

/** Italic serif accent used for one emphasised word per heading. */
export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('font-serif font-normal italic tracking-normal text-violet-600', className)}>
      {children}
    </span>
  )
}
