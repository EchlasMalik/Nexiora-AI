// Minimal Stripe REST API client — raw fetch against api.stripe.com rather
// than the npm `stripe` SDK, matching how the Anthropic integration was
// built (no extra dependency for a handful of well-documented endpoints).

const STRIPE_API_BASE = 'https://api.stripe.com/v1'

// deno-lint-ignore no-explicit-any
export async function stripeRequest(
  secretKey: string,
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`${STRIPE_API_BASE}${path}`)
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }

  if (method === 'GET' && params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  } else if (params) {
    options.body = new URLSearchParams(params).toString()
  }

  const response = await fetch(url.toString(), options)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `Stripe API error (${response.status})`)
  }
  return data
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/** Verifies a Stripe webhook's `Stripe-Signature` header against the raw request body. */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=') as [string, string]))
  const timestamp = parts['t']
  const signature = parts['v1']
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${rawBody}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return timingSafeEqual(computedSignature, signature)
}

export type PlanKey = 'starter' | 'growth' | 'business'

export function priceIdForPlan(plan: PlanKey): string | undefined {
  const envKey = `STRIPE_PRICE_${plan.toUpperCase()}`
  return Deno.env.get(envKey)
}

export function planForPriceId(priceId: string | undefined): PlanKey {
  if (!priceId) return 'starter'
  const plans: PlanKey[] = ['starter', 'growth', 'business']
  return plans.find((plan) => priceIdForPlan(plan) === priceId) ?? 'starter'
}
