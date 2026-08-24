// Single source of truth for the landing page's pricing tiers — shared by
// Pricing.tsx (visible UI) and the homepage's SoftwareApplication JSON-LD
// `offers`, so structured data never asserts a price the page doesn't
// actually show.
export interface PricingPlan {
  name: string
  /** Numeric price in GBP, or null for a plan with no fixed price (e.g. "Custom"). */
  priceGBP: number | null
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}

export const plans: PricingPlan[] = [
  {
    name: 'Starter',
    priceGBP: 39,
    price: '£39',
    period: '/mo',
    description: 'For solo founders getting their first chatbot live.',
    features: ['1 chatbot', '500 conversations/mo', 'Email support', 'Basic analytics'],
    cta: 'Start free trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    priceGBP: 79,
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
    priceGBP: 199,
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
    priceGBP: null,
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
