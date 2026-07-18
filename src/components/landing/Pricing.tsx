import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const plans = [
  {
    name: 'Starter',
    price: '£39',
    period: '/mo',
    description: 'For solo founders getting their first chatbot live.',
    features: ['1 chatbot', '500 conversations/mo', 'Email support', 'Basic analytics'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '£79',
    period: '/mo',
    description: 'For growing teams that live and die by their pipeline.',
    features: [
      '3 chatbots',
      '2,500 conversations/mo',
      'Lead capture & booking',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '£199',
    period: '/mo',
    description: 'For teams that need human handoff and custom branding.',
    features: [
      '10 chatbots',
      '10,000 conversations/mo',
      'Human handoff',
      'Remove Nexiora branding',
      'Dedicated support',
    ],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations with custom integration and SLA needs.',
    features: [
      'Unlimited chatbots',
      'Custom integrations',
      'SLA & onboarding',
      'Dedicated account manager',
    ],
    cta: 'Talk to staff',
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-brand-text-secondary">
            Start free for 14 days. No credit card required.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Card
                className={cn(
                  'relative h-full',
                  plan.highlighted && 'border-violet-300 shadow-lg ring-1 ring-violet-200'
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-violet-600 to-violet-800 px-3 py-1 text-xs font-medium text-white shadow-sm">
                    Most popular
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="text-3xl font-semibold text-brand-navy">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-brand-text-secondary">{plan.period}</span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-6">
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-brand-text-secondary">
                        <Check className="mt-0.5 size-4 shrink-0 text-violet-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button
                      variant={plan.highlighted ? 'default' : 'outline'}
                      className="w-full justify-center"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
