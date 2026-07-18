// Nexiora AI — stripe-webhook Edge Function (Phase: Billing)
//
// Public endpoint (Stripe calls this from their own servers, not from a
// browser — there's no Supabase session to verify a JWT against). Protected
// instead by Stripe's own webhook signature scheme: every request is HMAC
// signed with STRIPE_WEBHOOK_SECRET, verified before any event is trusted.
// This is the *only* place subscription state is ever written.
//
// Deploy with: npx supabase functions deploy stripe-webhook --no-verify-jwt
// Secret:      npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//              (get this by registering the endpoint URL in the Stripe
//              Dashboard: Developers -> Webhooks -> Add endpoint, pointing at
//              https://<project-ref>.supabase.co/functions/v1/stripe-webhook)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { planForPriceId, stripeRequest, verifyStripeSignature } from '../_shared/stripe.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// deno-lint-ignore no-explicit-any
async function upsertFromStripeSubscription(adminClient: any, sub: any, statusOverride?: string) {
  const orgId = sub.metadata?.org_id
  if (!orgId) {
    console.error('Stripe subscription missing metadata.org_id', sub.id)
    return
  }
  const plan = planForPriceId(sub.items?.data?.[0]?.price?.id)
  await adminClient.from('subscriptions').upsert(
    {
      org_id: orgId,
      stripe_customer_id: sub.customer,
      stripe_subscription_id: sub.id,
      plan,
      status: statusOverride ?? sub.status,
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    },
    { onConflict: 'org_id' }
  )
}

Deno.serve(async (req: Request) => {
  if (!STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
    return jsonError('Billing is not configured yet.', 503)
  }

  const signatureHeader = req.headers.get('Stripe-Signature')
  if (!signatureHeader) return jsonError('Missing Stripe-Signature header', 400)

  const rawBody = await req.text()
  const isValid = await verifyStripeSignature(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET)
  if (!isValid) return jsonError('Invalid signature', 401)

  let event: { type: string; data: { object: Record<string, unknown> } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return jsonError('Invalid JSON payload', 400)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { subscription?: string }
        if (session.subscription) {
          const sub = await stripeRequest(STRIPE_SECRET_KEY, 'GET', `/subscriptions/${session.subscription}`)
          await upsertFromStripeSubscription(adminClient, sub)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        await upsertFromStripeSubscription(adminClient, sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await upsertFromStripeSubscription(adminClient, sub, 'canceled')
        break
      }
      default:
        // Other event types are intentionally ignored.
        break
    }
  } catch (err) {
    console.error('Failed to process Stripe event', event.type, err)
    return jsonError('Failed to process event', 500)
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
})
