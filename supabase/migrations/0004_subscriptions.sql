-- Nexiora AI — Stripe billing (Phase: Billing)
-- One subscription row per org, written only by the stripe-webhook Edge
-- Function (service role) in response to real Stripe events — never
-- directly by clients, so there are no insert/update/delete policies here.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'business', 'enterprise')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index subscriptions_stripe_customer_id_idx on public.subscriptions(stripe_customer_id);
create index subscriptions_stripe_subscription_id_idx on public.subscriptions(stripe_subscription_id);

create trigger set_subscriptions_updated_date
  before update on public.subscriptions
  for each row execute function public.set_updated_date();

alter table public.subscriptions enable row level security;

create policy "org members can read their subscription" on public.subscriptions
  for select using (public.is_org_member(org_id));
-- Deliberately no insert/update/delete policies: only the service role
-- (stripe-webhook, create-checkout-session) ever writes to this table.
