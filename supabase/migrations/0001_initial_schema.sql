-- Nexiora AI — initial schema (Phase 1: Foundation)
-- Org-based multi-tenancy: every entity row belongs to an org, membership
-- controls access via RLS. Paste this whole file into the Supabase SQL
-- Editor (or run via `supabase db push` once the CLI is linked) once.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Helper: auto-update `updated_date` on any row UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- orgs + memberships (tenancy root)
-- ---------------------------------------------------------------------------
create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create trigger set_orgs_updated_date
  before update on public.orgs
  for each row execute function public.set_updated_date();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  created_date timestamptz not null default now(),
  unique (org_id, user_id)
);

create index memberships_org_id_idx on public.memberships(org_id);
create index memberships_user_id_idx on public.memberships(user_id);

-- Helper used by every RLS policy below. security definer + stable lets
-- Postgres evaluate this once per statement without recursing into
-- memberships' own RLS.
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships
    where org_id = check_org_id and user_id = (select auth.uid())
  );
$$;

alter table public.orgs enable row level security;
alter table public.memberships enable row level security;

create policy "members can read their orgs" on public.orgs
  for select using (public.is_org_member(id));

create policy "members can update their orgs" on public.orgs
  for update using (public.is_org_member(id));

create policy "authenticated users can create orgs" on public.orgs
  for insert with check ((select auth.uid()) is not null);

create policy "members can read memberships in their orgs" on public.memberships
  for select using (public.is_org_member(org_id));

create policy "members can manage memberships in their orgs" on public.memberships
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- Shared entity policy generator (applied per-table below)
-- ---------------------------------------------------------------------------
-- Every entity table has: id, org_id, created_by, created_date, updated_date,
-- plus its own fields (matching src/entities/schemas.ts exactly).

-- chatbots -------------------------------------------------------------------
create table public.chatbots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  name text not null,
  company_name text not null default '',
  business_description text not null default '',
  industry text not null default '',
  tone text not null default 'professional'
    check (tone in ('friendly', 'professional', 'luxury', 'playful', 'supportive', 'sales')),
  welcome_message text not null default '',
  theme_color text not null default '#2563EB',
  avatar_url text not null default '',
  suggested_questions text[] not null default '{}',
  embed_id text not null unique,
  position text not null default 'bottom-right'
    check (position in ('bottom-right', 'bottom-left')),
  powered_by_branding boolean not null default true,
  business_hours text not null default '',
  offline_message text not null default '',
  fallback_message text not null default '',
  custom_prompt text not null default '',
  booking_url text not null default '',
  status text not null default 'active'
    check (status in ('active', 'paused', 'draft'))
);

create index chatbots_org_id_idx on public.chatbots(org_id);
create index chatbots_embed_id_idx on public.chatbots(embed_id);

create trigger set_chatbots_updated_date
  before update on public.chatbots
  for each row execute function public.set_updated_date();

alter table public.chatbots enable row level security;

create policy "org members can read chatbots" on public.chatbots
  for select using (public.is_org_member(org_id));
create policy "org members can insert chatbots" on public.chatbots
  for insert with check (public.is_org_member(org_id));
create policy "org members can update chatbots" on public.chatbots
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete chatbots" on public.chatbots
  for delete using (public.is_org_member(org_id));

-- conversations ----------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  visitor_id text not null default '',
  visitor_name text not null default '',
  status text not null default 'ai' check (status in ('ai', 'human', 'closed')),
  tags text[] not null default '{}',
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  lead_score integer not null default 0,
  summary text not null default '',
  unread boolean not null default false
);

create index conversations_org_id_idx on public.conversations(org_id);
create index conversations_chatbot_id_idx on public.conversations(chatbot_id);

create trigger set_conversations_updated_date
  before update on public.conversations
  for each row execute function public.set_updated_date();

alter table public.conversations enable row level security;

create policy "org members can read conversations" on public.conversations
  for select using (public.is_org_member(org_id));
create policy "org members can insert conversations" on public.conversations
  for insert with check (public.is_org_member(org_id));
create policy "org members can update conversations" on public.conversations
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete conversations" on public.conversations
  for delete using (public.is_org_member(org_id));

-- messages -----------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'operator')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index messages_org_id_idx on public.messages(org_id);
create index messages_conversation_id_idx on public.messages(conversation_id);

create trigger set_messages_updated_date
  before update on public.messages
  for each row execute function public.set_updated_date();

alter table public.messages enable row level security;

create policy "org members can read messages" on public.messages
  for select using (public.is_org_member(org_id));
create policy "org members can insert messages" on public.messages
  for insert with check (public.is_org_member(org_id));
create policy "org members can update messages" on public.messages
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete messages" on public.messages
  for delete using (public.is_org_member(org_id));

-- contacts -------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  requirements text not null default '',
  budget text not null default '',
  timeline text not null default '',
  status text not null default 'new'
    check (status in ('new', 'qualified', 'contacted', 'won', 'lost'))
);

create index contacts_org_id_idx on public.contacts(org_id);
create index contacts_chatbot_id_idx on public.contacts(chatbot_id);

create trigger set_contacts_updated_date
  before update on public.contacts
  for each row execute function public.set_updated_date();

alter table public.contacts enable row level security;

create policy "org members can read contacts" on public.contacts
  for select using (public.is_org_member(org_id));
create policy "org members can insert contacts" on public.contacts
  for insert with check (public.is_org_member(org_id));
create policy "org members can update contacts" on public.contacts
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete contacts" on public.contacts
  for delete using (public.is_org_member(org_id));

-- appointments -----------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  chatbot_id text not null default 'manual',
  conversation_id uuid references public.conversations(id) on delete set null,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  scheduled_at timestamptz,
  timezone text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  source text not null default '',
  notes text not null default ''
);

create index appointments_org_id_idx on public.appointments(org_id);

create trigger set_appointments_updated_date
  before update on public.appointments
  for each row execute function public.set_updated_date();

alter table public.appointments enable row level security;

create policy "org members can read appointments" on public.appointments
  for select using (public.is_org_member(org_id));
create policy "org members can insert appointments" on public.appointments
  for insert with check (public.is_org_member(org_id));
create policy "org members can update appointments" on public.appointments
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete appointments" on public.appointments
  for delete using (public.is_org_member(org_id));

-- knowledge_documents ----------------------------------------------------
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),

  chatbot_id uuid not null references public.chatbots(id) on delete cascade,
  title text not null,
  content text not null default '',
  type text not null default 'text'
    check (type in ('text', 'url', 'pdf', 'faq', 'note')),
  source_url text not null default '',
  status text not null default 'ready'
    check (status in ('processing', 'ready', 'failed')),
  chunk_count integer not null default 0
);

create index knowledge_documents_org_id_idx on public.knowledge_documents(org_id);
create index knowledge_documents_chatbot_id_idx on public.knowledge_documents(chatbot_id);

create trigger set_knowledge_documents_updated_date
  before update on public.knowledge_documents
  for each row execute function public.set_updated_date();

alter table public.knowledge_documents enable row level security;

create policy "org members can read knowledge_documents" on public.knowledge_documents
  for select using (public.is_org_member(org_id));
create policy "org members can insert knowledge_documents" on public.knowledge_documents
  for insert with check (public.is_org_member(org_id));
create policy "org members can update knowledge_documents" on public.knowledge_documents
  for update using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));
create policy "org members can delete knowledge_documents" on public.knowledge_documents
  for delete using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- New user bootstrap: create a personal org + owner membership automatically
-- on signup, so the app always has somewhere to put the first chatbot.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.orgs (name)
  values (coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)) || '''s workspace')
  returning id into new_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
