// Nexiora AI — create-portal-session Edge Function (Phase: Billing)
//
// Authenticated. Returns a Stripe Billing Portal URL for the caller's org so
// they can update payment method, change plan, or cancel — all through
// Stripe's own hosted UI rather than custom-built screens.
//
// Deploy with: npx supabase functions deploy create-portal-session

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { stripeRequest } from '../_shared/stripe.ts'

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

    const { origin } = (await req.json()) as { origin?: string }
    if (!origin) return jsonError('origin is required', 400)

    if (!STRIPE_SECRET_KEY) {
      return jsonError('Billing is not configured yet.', 503)
    }

    const { data: membership } = await adminClient
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonError('No workspace found for this account', 404)

    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', membership.org_id)
      .maybeSingle()
    if (!sub?.stripe_customer_id) {
      return jsonError('No billing account found yet — subscribe to a plan first.', 404)
    }

    const portalSession = await stripeRequest(STRIPE_SECRET_KEY, 'POST', '/billing_portal/sessions', {
      customer: sub.stripe_customer_id,
      return_url: `${origin}/dashboard/billing`,
    })

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
