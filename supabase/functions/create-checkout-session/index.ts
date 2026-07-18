// Nexiora AI — create-checkout-session Edge Function (Phase: Billing)
//
// Authenticated. Creates (or reuses) a Stripe Customer for the caller's org
// and returns a Checkout Session URL to redirect the browser to. Actual plan
// activation happens via stripe-webhook once Stripe confirms payment — this
// function only ever kicks off the flow, never grants access directly.
//
// Deploy with: npx supabase functions deploy create-checkout-session
// Secrets:     npx supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_STARTER=price_... STRIPE_PRICE_GROWTH=price_... STRIPE_PRICE_BUSINESS=price_...

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { priceIdForPlan, stripeRequest, type PlanKey } from '../_shared/stripe.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('Missing authorization', 401)

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser()
    if (authError || !user) return jsonError('Invalid session', 401)

    const { plan, origin } = (await req.json()) as { plan?: PlanKey; origin?: string }
    if (!plan || !['starter', 'growth', 'business'].includes(plan)) {
      return jsonError('A valid plan (starter, growth, business) is required', 400)
    }
    if (!origin) return jsonError('origin is required', 400)

    if (!STRIPE_SECRET_KEY) {
      return jsonError('Billing is not configured yet — add STRIPE_SECRET_KEY as an Edge Function secret.', 503)
    }

    const priceId = priceIdForPlan(plan)
    if (!priceId) {
      return jsonError(`No Stripe price configured for the ${plan} plan yet.`, 503)
    }

    const { data: membership } = await adminClient
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonError('No workspace found for this account', 404)

    const { data: existingSub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', membership.org_id)
      .maybeSingle()

    let customerId = existingSub?.stripe_customer_id as string | undefined

    if (!customerId) {
      const customer = await stripeRequest(STRIPE_SECRET_KEY, 'POST', '/customers', {
        email: user.email ?? '',
        'metadata[org_id]': membership.org_id,
      })
      customerId = customer.id
      await adminClient
        .from('subscriptions')
        .upsert({ org_id: membership.org_id, stripe_customer_id: customerId }, { onConflict: 'org_id' })
    }

    const session = await stripeRequest(STRIPE_SECRET_KEY, 'POST', '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId as string,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
      'metadata[org_id]': membership.org_id,
      'subscription_data[metadata][org_id]': membership.org_id,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
