import { supabase } from './supabase'

export interface Subscription {
  id: string
  org_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: 'starter' | 'growth' | 'business' | 'enterprise'
  status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
  current_period_end: string | null
}

export async function fetchSubscription(orgId: string): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('org_id', orgId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Subscription | null) ?? null
}

export interface UsageStats {
  messagesThisMonth: number
  knowledgeBaseMB: number
}

/** Real usage, computed from live data — not a placeholder. */
export async function fetchUsageStats(orgId: string): Promise<UsageStats> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ count: messagesThisMonth }, { data: docs }] = await Promise.all([
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_date', startOfMonth.toISOString()),
    supabase.from('knowledge_documents').select('content').eq('org_id', orgId),
  ])

  const totalBytes = (docs ?? []).reduce((sum, doc) => sum + new Blob([doc.content ?? '']).size, 0)

  return {
    messagesThisMonth: messagesThisMonth ?? 0,
    knowledgeBaseMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
  }
}

// Mirrors MONTHLY_AI_BUDGET_USD in supabase/functions/_shared/chat-core.ts —
// keep the two in sync if the budget or plan set ever changes.
export const MONTHLY_AI_BUDGET_USD: Record<Subscription['plan'], number> = {
  starter: 15,
  growth: 50,
  business: 150,
  enterprise: 750,
}

/** Real AI spend this calendar month, from actual token usage Anthropic reported — not an estimate of message count. */
export async function fetchAiSpend(orgId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_monthly_ai_spend', { check_org_id: orgId })
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

async function callBillingFunction(path: string, body: Record<string, unknown>): Promise<{ url: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ...body, origin: window.location.origin }),
  })

  const data = await response.json().catch(() => ({}) as { error?: string; url?: string })
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`)
  }
  return data as { url: string }
}

export async function startCheckout(plan: 'starter' | 'growth' | 'business'): Promise<void> {
  const { url } = await callBillingFunction('create-checkout-session', { plan })
  window.location.href = url
}

export async function openBillingPortal(): Promise<void> {
  const { url } = await callBillingFunction('create-portal-session', {})
  window.location.href = url
}
