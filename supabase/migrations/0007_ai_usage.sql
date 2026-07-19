-- Nexiora AI — per-org AI spend cap (Phase: Polish)
--
-- The widget/chatbot daily message caps bound worst-case *volume* per
-- chatbot, but not *cost* per org — a chatbot with heavy RAG context or long
-- replies could burn far more per message than another. This table logs
-- actual token usage per AI call (real numbers from Anthropic's response,
-- not an estimate of volume) so a real dollar figure can be compared
-- against a per-plan monthly budget before the next call is ever made.
--
-- Insert-only, service-role only (Edge Functions use the service role key,
-- which bypasses RLS entirely) — the SELECT policy below exists only so the
-- dashboard can show org members their own usage.

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  created_date timestamptz not null default now()
);

create index ai_usage_log_org_id_created_date_idx on public.ai_usage_log(org_id, created_date);

alter table public.ai_usage_log enable row level security;

create policy "org members can read their usage log" on public.ai_usage_log
  for select using (public.is_org_member(org_id));

-- No security definer here on purpose: this runs as the caller, so it only
-- ever sums rows the caller's own RLS policy above already lets them read.
create function public.get_monthly_ai_spend(check_org_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(sum(estimated_cost_usd), 0)
  from public.ai_usage_log
  where org_id = check_org_id
    and created_date >= date_trunc('month', now());
$$;
