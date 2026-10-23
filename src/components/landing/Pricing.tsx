import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { plans } from '@/content/pricingPlans'
import { Reveal, SectionHeading, Accent } from './Reveal'

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple pricing that <Accent>scales</Accent> with you
            </>
          }
          description="Every plan starts with a 14-day free trial. No credit card required."
        />

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
          {plans.map((plan, i) => {
            const featured = plan.highlighted
            return (
              <Reveal key={plan.name} delay={i * 0.06} className="h-full">
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-3xl p-7',
                    featured
                      ? 'bg-brand-navy text-white shadow-2xl shadow-violet-900/30 ring-1 ring-violet-500/40'
                      : 'border border-border/80 bg-white'
                  )}
                >
                  {featured && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                      <div className="absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-violet-500/40 blur-3xl" />
                    </div>
                  )}

                  <div className="relative flex items-center justify-between">
                    <h3 className={cn('font-semibold', featured ? 'text-white' : 'text-brand-navy')}>{plan.name}</h3>
                    {featured && (
                      <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/30">
                        Most popular
                      </span>
                    )}
                  </div>

                  <div className="relative mt-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">{plan.price}</span>
                    {plan.period && (
                      <span className={cn('text-sm', featured ? 'text-slate-400' : 'text-brand-text-secondary')}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={cn('relative mt-3 text-sm', featured ? 'text-slate-300' : 'text-brand-text-secondary')}>
                    {plan.description}
                  </p>

                  <Link to="/register" className="relative mt-6">
                    <Button
                      variant={featured ? 'default' : 'outline'}
                      className={cn(
                        'h-10 w-full justify-center rounded-full',
                        featured && 'from-violet-500 to-violet-700 shadow-lg shadow-violet-600/40',
                        !featured && 'hover:bg-slate-50 hover:text-brand-navy'
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

                  <ul
                    className={cn(
                      'relative mt-7 space-y-3 border-t pt-6',
                      featured ? 'border-white/10' : 'border-border/70'
                    )}
                  >
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          'flex items-start gap-2.5 text-sm',
                          featured ? 'text-slate-200' : 'text-brand-text-secondary'
                        )}
                      >
                        <Check
                          className={cn('mt-0.5 size-4 shrink-0', featured ? 'text-violet-300' : 'text-violet-600')}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-10 text-center text-sm text-brand-text-secondary">
            Prices in GBP · Upgrade, downgrade or cancel anytime from your dashboard.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
