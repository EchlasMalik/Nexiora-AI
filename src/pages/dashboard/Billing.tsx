import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Check, CreditCard } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo } from '@/entities'
import {
  fetchSubscription,
  fetchUsageStats,
  fetchAiSpend,
  MONTHLY_AI_BUDGET_USD,
  startCheckout,
  openBillingPortal,
  type Subscription,
} from '@/lib/billing'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UsageStat {
  label: string
  used: number
  limit: number
  unit?: string
  prefix?: string
  decimals?: number
}

const plans: {
  key: 'starter' | 'growth' | 'business' | 'enterprise'
  name: string
  price: string
  period: string
  features: string[]
  chatbotLimit: number
  messageLimit: number
}[] = [
  {
    key: 'starter',
    name: 'Starter',
    price: '£39',
    period: '/mo',
    features: ['1 chatbot', '500 conversations/mo', 'Email support', 'Basic analytics'],
    chatbotLimit: 1,
    messageLimit: 500,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '£79',
    period: '/mo',
    features: [
      '3 chatbots',
      '2,500 conversations/mo',
      'Lead capture & booking',
      'Priority support',
      'Advanced analytics',
    ],
    chatbotLimit: 3,
    messageLimit: 2500,
  },
  {
    key: 'business',
    name: 'Business',
    price: '£199',
    period: '/mo',
    features: [
      '10 chatbots',
      '10,000 conversations/mo',
      'Human handoff',
      'Remove Nexiora branding',
      'Dedicated support',
    ],
    chatbotLimit: 10,
    messageLimit: 10000,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited chatbots', 'Custom integrations', 'SLA & onboarding', 'Dedicated account manager'],
    chatbotLimit: Infinity,
    messageLimit: Infinity,
  },
]

function formatStatNumber(value: number, decimals?: number): string {
  return decimals != null ? value.toFixed(decimals) : value.toLocaleString()
}

function UsageCard({ stat }: { stat: UsageStat }) {
  const pct = stat.limit > 0 ? Math.min(100, Math.round((stat.used / stat.limit) * 100)) : 0

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-brand-navy">{stat.label}</p>
          <p className="text-sm text-brand-text-secondary">
            {stat.prefix ?? ''}
            {formatStatNumber(stat.used, stat.decimals)}
            {stat.unit ?? ''} / {stat.prefix ?? ''}
            {formatStatNumber(stat.limit, stat.decimals)}
            {stat.unit ?? ''}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-violet-600'
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Billing() {
  const { orgId } = useOrg()
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  const { data: chatbots = [] } = useQuery({
    queryKey: ['chatbots', orgId],
    queryFn: () => ChatbotRepo.list(orgId!),
    enabled: !!orgId,
  })
  const activeChatbots = chatbots.filter((bot) => bot.status === 'active').length

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useQuery<Subscription | null>({
    queryKey: ['subscription', orgId],
    queryFn: () => fetchSubscription(orgId!),
    enabled: !!orgId,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout')
    if (checkout === 'success') {
      toast.success("Subscription updated — this can take a few seconds to fully sync.")
      refetchSubscription()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (checkout === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPlan = subscription?.status === 'active' || subscription?.status === 'trialing' ? subscription.plan : null
  const currentPlanDetails = plans.find((p) => p.key === currentPlan) ?? plans[0]

  const { data: usage } = useQuery({
    queryKey: ['usageStats', orgId],
    queryFn: () => fetchUsageStats(orgId!),
    enabled: !!orgId,
  })

  const { data: aiSpend } = useQuery({
    queryKey: ['aiSpend', orgId],
    queryFn: () => fetchAiSpend(orgId!),
    enabled: !!orgId,
  })

  const usageStats: UsageStat[] = [
    { label: 'Messages this month', used: usage?.messagesThisMonth ?? 0, limit: currentPlanDetails.messageLimit },
    {
      label: 'AI usage this month',
      used: aiSpend ?? 0,
      limit: MONTHLY_AI_BUDGET_USD[currentPlanDetails.key],
      prefix: '$',
      decimals: 2,
    },
    { label: 'Knowledge base', used: usage?.knowledgeBaseMB ?? 0, limit: 50, unit: ' MB' },
    { label: 'Active chatbots', used: activeChatbots, limit: currentPlanDetails.chatbotLimit },
  ]

  async function handlePlanClick(planKey: string) {
    if (planKey === currentPlan) return
    if (planKey === 'enterprise') {
      toast.info('Reach out and we\'ll set up a custom plan for you.')
      return
    }
    setPendingPlan(planKey)
    try {
      await startCheckout(planKey as 'starter' | 'growth' | 'business')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout')
      setPendingPlan(null)
    }
  }

  async function handleManageBilling() {
    setIsOpeningPortal(true)
    try {
      await openBillingPortal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal')
      setIsOpeningPortal(false)
    }
  }

  return (
    <DashboardLayout>
      <PageHeader title="Billing" description="Manage your plan, usage, and payment details." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {usageStats.map((stat) => (
          <UsageCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan
          return (
            <Card key={plan.key} className={cn('relative h-full', isCurrent && 'border-violet-300 ring-1 ring-violet-200')}>
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-violet-600 to-violet-800 px-3 py-1 text-xs font-medium text-white shadow-sm">
                  Current
                </span>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-3xl font-semibold text-brand-navy">{plan.price}</span>
                  {plan.period && <span className="text-sm text-brand-text-secondary">{plan.period}</span>}
                </div>
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
                <Button
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || pendingPlan === plan.key || subscriptionLoading}
                  onClick={() => handlePlanClick(plan.key)}
                  className="w-full justify-center"
                >
                  {isCurrent
                    ? 'Current plan'
                    : pendingPlan === plan.key
                      ? 'Redirecting…'
                      : plan.key === 'enterprise'
                        ? 'Talk to sales'
                        : `Switch to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment &amp; billing</CardTitle>
          <CardDescription>Manage your payment method, invoices, and subscription in Stripe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-navy">
                  {subscription?.stripe_customer_id ? 'Billing account connected' : 'No billing account yet'}
                </p>
                <p className="text-xs text-brand-text-secondary">
                  {subscription?.current_period_end
                    ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : 'Subscribe to a plan to set up billing.'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={isOpeningPortal || !subscription?.stripe_customer_id}
            >
              {isOpeningPortal ? 'Opening…' : 'Manage'}
            </Button>
          </div>
          <p className="text-xs text-brand-text-secondary">Payments are securely processed. Powered by Stripe.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
