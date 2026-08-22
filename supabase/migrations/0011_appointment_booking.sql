-- Nexiora AI — native widget appointment booking
--
-- Until now, appointments were 100% manually typed into the dashboard —
-- nothing ever connected the `appointments` table to an actual chatbot
-- conversation. This adds the missing path: a visitor books directly from
-- the widget via a new anonymous RPC, landing as a 'pending' row for the
-- org to review (never auto-confirmed), the same way a manual entry works
-- today.
--
-- `accepts_appointments` defaults to true so every existing chatbot gets the
-- widget's "Book an appointment" option immediately; owners can turn it off
-- per-bot in Settings.
--
-- `widget_messages.kind` lets booking attempts and chat messages share one
-- rate-limit table with independent hourly budgets — a booking spree can't
-- eat into a visitor's chat allowance, or vice versa.

alter table public.chatbots
  add column accepts_appointments boolean not null default true;

alter table public.widget_messages
  add column kind text not null default 'chat';

-- public_chat_gate's rate-limit counts must ignore booking attempts now that
-- they share this table — signature is unchanged, so existing grants hold.
create or replace function public.public_chat_gate(
  p_chatbot_id uuid,
  p_session_id text,
  p_user_message text,
  p_visitor_hourly_limit integer,
  p_chatbot_daily_limit integer,
  p_plan_budgets jsonb,
  p_generic_fallback text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chatbot record;
  v_visitor_count integer;
  v_chatbot_count integer;
  v_conversation_id uuid;
  v_plan text;
  v_status text;
  v_spent numeric;
  v_budget numeric;
  v_fallback_text text;
begin
  select id, org_id, name, company_name, business_description, industry, tone,
         custom_prompt, booking_url, fallback_message, status
  into v_chatbot
  from public.chatbots
  where id = p_chatbot_id;

  if v_chatbot.id is null or v_chatbot.status <> 'active' then
    return jsonb_build_object('found', false);
  end if;

  select count(*) into v_visitor_count
  from public.widget_messages
  where chatbot_id = p_chatbot_id
    and visitor_session = p_session_id
    and kind = 'chat'
    and created_date >= now() - interval '1 hour';

  if v_visitor_count >= p_visitor_hourly_limit then
    return jsonb_build_object('found', true, 'rate_limited', 'visitor');
  end if;

  select count(*) into v_chatbot_count
  from public.widget_messages
  where chatbot_id = p_chatbot_id
    and kind = 'chat'
    and created_date >= now() - interval '1 day';

  if v_chatbot_count >= p_chatbot_daily_limit then
    return jsonb_build_object('found', true, 'rate_limited', 'chatbot');
  end if;

  -- Record this attempt before calling Claude, so retries/failures still count toward the caps.
  insert into public.widget_messages (chatbot_id, visitor_session, kind)
  values (p_chatbot_id, p_session_id, 'chat');

  select id into v_conversation_id
  from public.conversations
  where chatbot_id = p_chatbot_id and visitor_id = p_session_id;

  if v_conversation_id is not null then
    -- Any new visitor message means there's something an operator hasn't
    -- seen yet, regardless of whether the conversation is still AI-managed.
    update public.conversations set unread = true where id = v_conversation_id;
  else
    insert into public.conversations (org_id, chatbot_id, visitor_id, status, unread)
    values (v_chatbot.org_id, p_chatbot_id, p_session_id, 'ai', true)
    returning id into v_conversation_id;
  end if;

  -- Matches the original's plain-truthy check (`if (lastUserTurn?.content)`)
  -- exactly — a whitespace-only string is still "truthy" in JS, so this only
  -- skips a genuinely empty string, not one that trims to empty.
  if p_user_message is not null and p_user_message <> '' then
    insert into public.messages (org_id, conversation_id, role, content)
    values (v_chatbot.org_id, v_conversation_id, 'user', p_user_message);
  end if;

  select status, plan into v_status, v_plan
  from public.subscriptions
  where org_id = v_chatbot.org_id;

  if v_status is null or v_status not in ('active', 'trialing') then
    v_fallback_text := coalesce(nullif(v_chatbot.fallback_message, ''), p_generic_fallback);
    insert into public.messages (org_id, conversation_id, role, content)
    values (v_chatbot.org_id, v_conversation_id, 'assistant', v_fallback_text);
    return jsonb_build_object('found', true, 'gated', true, 'fallback_text', v_fallback_text);
  end if;

  v_spent := public.get_monthly_ai_spend(v_chatbot.org_id);
  v_budget := (p_plan_budgets ->> v_plan)::numeric;

  if v_spent >= v_budget then
    v_fallback_text := coalesce(nullif(v_chatbot.fallback_message, ''), p_generic_fallback);
    insert into public.messages (org_id, conversation_id, role, content)
    values (v_chatbot.org_id, v_conversation_id, 'assistant', v_fallback_text);
    return jsonb_build_object('found', true, 'gated', true, 'fallback_text', v_fallback_text);
  end if;

  return jsonb_build_object(
    'found', true,
    'gated', false,
    'conversation_id', v_conversation_id,
    'chatbot', jsonb_build_object(
      'id', v_chatbot.id,
      'org_id', v_chatbot.org_id,
      'name', v_chatbot.name,
      'company_name', v_chatbot.company_name,
      'business_description', v_chatbot.business_description,
      'industry', v_chatbot.industry,
      'tone', v_chatbot.tone,
      'custom_prompt', v_chatbot.custom_prompt,
      'booking_url', v_chatbot.booking_url,
      'fallback_message', v_chatbot.fallback_message
    )
  );
end;
$$;

-- Resolves a trusted chatbot_id -> org_id (mirrors public_chat_gate's own
-- lookup), rate-limits, looks up an existing conversation if one exists, and
-- inserts a 'pending' appointment. SECURITY DEFINER + service-role-only
-- execute, same posture as every other anonymous write in this codebase.
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

  return jsonb_build_object(
    'found', true,
    'rate_limited', false,
    'appointment_id', v_appointment_id,
    'org_id', v_chatbot.org_id
  );
end;
$$;

revoke execute on function public.public_book_appointment(uuid, text, text, text, text, timestamptz, text, text, integer) from public, anon, authenticated;
grant execute on function public.public_book_appointment(uuid, text, text, text, text, timestamptz, text, text, integer) to service_role;
