-- Nexiora AI — public widget rate limiting (Phase 4)
-- Insert-only log of public widget messages, used to enforce a per-visitor
-- and per-chatbot rate limit in the public-chat Edge Function. Only ever
-- touched by Edge Functions via the service role — RLS is enabled with no
-- policies, so it's deny-all for both anon and authenticated clients.

create table public.widget_messages (
  id uuid primary key default gen_random_uuid(),
  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  visitor_session text not null,
  created_date timestamptz not null default now()
);

create index widget_messages_chatbot_id_idx on public.widget_messages(chatbot_id, created_date);
create index widget_messages_visitor_idx on public.widget_messages(chatbot_id, visitor_session, created_date);

alter table public.widget_messages enable row level security;
-- Deliberately no policies: only the service role (used inside Edge
-- Functions) can read/write this table.
