-- Nexiora AI — real owner notifications + native lead capture
--
-- The Settings "Notifications" toggles have only ever lived in browser
-- localStorage (src/lib/preferences.ts) — no Edge Function can read that, so
-- nothing has ever actually been sent. Moving the org-level settings here
-- makes them server-readable, which is the actual fix, not a workaround.
--
-- accepts_lead_capture mirrors accepts_appointments (0011): a native
-- "Leave your details" widget form, not AI-driven extraction, gated per-bot.
--
-- Bookings now also upsert a linked Contact (if one doesn't already exist
-- for that chatbot+email), so the Contacts pipeline gets populated from
-- appointments alone, even before the standalone lead form is ever used.

alter table public.orgs
  add column notification_email text not null default '',
  add column notify_new_lead boolean not null default true,
  add column notify_appointment boolean not null default true,
  add column notify_escalation boolean not null default true,
  add column notify_weekly_summary boolean not null default false;

alter table public.chatbots
  add column accepts_lead_capture boolean not null default true;

-- Same signature as 0011, so existing grants hold. Adds a linked-Contact
-- upsert after the appointment insert — skipped if a contact for this
-- chatbot+email already exists, so re-booking never creates a duplicate or
-- clobbers whatever status/notes staff have since set on it.
create or replace function public.public_book_appointment(
  p_chatbot_id uuid,
  p_session_id text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_scheduled_at timestamptz,
  p_timezone text,
  p_notes text,
  p_hourly_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chatbot record;
  v_conversation_id uuid;
  v_recent_count integer;
  v_appointment_id uuid;
  v_existing_contact_id uuid;
begin
  select id, org_id, accepts_appointments, status
  into v_chatbot
  from public.chatbots
  where id = p_chatbot_id;

  if v_chatbot.id is null or v_chatbot.status <> 'active' or not v_chatbot.accepts_appointments then
    return jsonb_build_object('found', false);
  end if;

  select count(*) into v_recent_count
  from public.widget_messages
  where chatbot_id = p_chatbot_id
    and visitor_session = p_session_id
    and kind = 'booking'
    and created_date >= now() - interval '1 hour';

  if v_recent_count >= p_hourly_limit then
    return jsonb_build_object('found', true, 'rate_limited', true);
  end if;

  insert into public.widget_messages (chatbot_id, visitor_session, kind)
  values (p_chatbot_id, p_session_id, 'booking');

  select id into v_conversation_id
  from public.conversations
  where chatbot_id = p_chatbot_id and visitor_id = p_session_id;

  insert into public.appointments (
    org_id, chatbot_id, conversation_id, contact_name, contact_email,
    contact_phone, scheduled_at, timezone, status, source, notes
  ) values (
    v_chatbot.org_id, p_chatbot_id::text, v_conversation_id, p_contact_name, p_contact_email,
    p_contact_phone, p_scheduled_at, p_timezone, 'pending', 'widget', p_notes
  )
  returning id into v_appointment_id;

  if p_contact_email <> '' then
    select id into v_existing_contact_id
    from public.contacts
    where chatbot_id = p_chatbot_id and email = p_contact_email;

    if v_existing_contact_id is null then
      insert into public.contacts (
        org_id, chatbot_id, conversation_id, name, email, phone, requirements, status
      ) values (
        v_chatbot.org_id, p_chatbot_id, v_conversation_id, p_contact_name, p_contact_email,
        p_contact_phone, p_notes, 'new'
      );
    end if;
  end if;

  return jsonb_build_object(
    'found', true,
    'rate_limited', false,
    'appointment_id', v_appointment_id,
    'org_id', v_chatbot.org_id
  );
end;
$$;

-- Resolves a trusted chatbot_id -> org_id (mirrors public_book_appointment's
-- own lookup), rate-limits (shares widget_messages with its own 'lead' kind),
-- looks up an existing conversation if one exists, and inserts a 'new'
-- contact. SECURITY DEFINER + service-role-only execute, same posture as
-- every other anonymous-write RPC in this codebase.
create or replace function public.public_capture_lead(
  p_chatbot_id uuid,
  p_session_id text,
  p_name text,
  p_email text,
  p_phone text,
  p_requirements text,
  p_hourly_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chatbot record;
  v_conversation_id uuid;
  v_recent_count integer;
  v_contact_id uuid;
begin
  select id, org_id, accepts_lead_capture, status
  into v_chatbot
  from public.chatbots
  where id = p_chatbot_id;

  if v_chatbot.id is null or v_chatbot.status <> 'active' or not v_chatbot.accepts_lead_capture then
    return jsonb_build_object('found', false);
  end if;

  select count(*) into v_recent_count
  from public.widget_messages
  where chatbot_id = p_chatbot_id
    and visitor_session = p_session_id
    and kind = 'lead'
    and created_date >= now() - interval '1 hour';

  if v_recent_count >= p_hourly_limit then
    return jsonb_build_object('found', true, 'rate_limited', true);
  end if;

  insert into public.widget_messages (chatbot_id, visitor_session, kind)
  values (p_chatbot_id, p_session_id, 'lead');

  select id into v_conversation_id
  from public.conversations
  where chatbot_id = p_chatbot_id and visitor_id = p_session_id;

  insert into public.contacts (
    org_id, chatbot_id, conversation_id, name, email, phone, requirements, status
  ) values (
    v_chatbot.org_id, p_chatbot_id, v_conversation_id, p_name, p_email, p_phone, p_requirements, 'new'
  )
  returning id into v_contact_id;

  return jsonb_build_object(
    'found', true,
    'rate_limited', false,
    'contact_id', v_contact_id,
    'org_id', v_chatbot.org_id
  );
end;
$$;

revoke execute on function public.public_capture_lead(uuid, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.public_capture_lead(uuid, text, text, text, text, text, integer) to service_role;
