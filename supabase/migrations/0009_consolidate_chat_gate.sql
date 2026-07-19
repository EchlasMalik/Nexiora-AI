-- Nexiora AI — consolidate the pre/post-AI-call chain into single round trips
--
-- public-chat was doing ~8 sequential round trips before ever calling Claude
-- (fetch chatbot, 2 rate-limit counts, log the attempt, find-or-create
-- conversation, insert the user message, check subscription, check monthly
-- spend) and 2 more after (log usage, insert the reply) — 11 total per
-- message. chat-completion had a smaller but same-shaped chain (4 pre, 1
-- post). Each of these functions does the exact same checks and writes as
-- before, just executed server-side in one call instead of driven step by
-- step from the Edge Function.
--
-- Business logic (rate-limit thresholds, plan budgets, fallback copy) is
-- deliberately NOT hardcoded here — every threshold is passed in as a
-- parameter from the same TypeScript constants that owned it before, so
-- there's still exactly one source of truth for those numbers.
--
-- SECURITY DEFINER because these need to write to tables (widget_messages,
-- conversations, messages, ai_usage_log) that anonymous/authenticated
-- callers have no direct RLS access to. Execute is explicitly restricted to
-- service_role only below — these must never be callable directly from a
-- browser with just the anon key, only from the Edge Functions.

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
    and created_date >= now() - interval '1 hour';

  if v_visitor_count >= p_visitor_hourly_limit then
    return jsonb_build_object('found', true, 'rate_limited', 'visitor');
  end if;

  select count(*) into v_chatbot_count
  from public.widget_messages
  where chatbot_id = p_chatbot_id
    and created_date >= now() - interval '1 day';

  if v_chatbot_count >= p_chatbot_daily_limit then
    return jsonb_build_object('found', true, 'rate_limited', 'chatbot');
  end if;

  -- Record this attempt before calling Claude, so retries/failures still count toward the caps.
  insert into public.widget_messages (chatbot_id, visitor_session)
  values (p_chatbot_id, p_session_id);

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

revoke execute on function public.public_chat_gate(uuid, text, text, integer, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.public_chat_gate(uuid, text, text, integer, integer, jsonb, text) to service_role;

create or replace function public.public_chat_complete(
  p_org_id uuid,
  p_chatbot_id uuid,
  p_conversation_id uuid,
  p_input_tokens integer,
  p_output_tokens integer,
  p_estimated_cost_usd numeric,
  p_reply_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_usage_log (org_id, chatbot_id, input_tokens, output_tokens, estimated_cost_usd)
  values (p_org_id, p_chatbot_id, p_input_tokens, p_output_tokens, p_estimated_cost_usd);

  if p_reply_text is not null and length(trim(p_reply_text)) > 0 then
    insert into public.messages (org_id, conversation_id, role, content)
    values (p_org_id, p_conversation_id, 'assistant', p_reply_text);
  end if;
end;
$$;

revoke execute on function public.public_chat_complete(uuid, uuid, uuid, integer, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.public_chat_complete(uuid, uuid, uuid, integer, integer, numeric, text) to service_role;

create or replace function public.chat_completion_gate(
  p_chatbot_id uuid,
  p_user_id uuid,
  p_plan_budgets jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chatbot record;
  v_is_member boolean;
  v_plan text;
  v_status text;
  v_spent numeric;
  v_budget numeric;
begin
  select id, org_id, name, company_name, business_description, industry, tone,
         custom_prompt, booking_url, fallback_message
  into v_chatbot
  from public.chatbots
  where id = p_chatbot_id;

  if v_chatbot.id is null then
    return jsonb_build_object('found', false);
  end if;

  select exists(
    select 1 from public.memberships
    where org_id = v_chatbot.org_id and user_id = p_user_id
  ) into v_is_member;

  if not v_is_member then
    return jsonb_build_object('found', true, 'authorized', false);
  end if;

  select status, plan into v_status, v_plan
  from public.subscriptions
  where org_id = v_chatbot.org_id;

  if v_status is null or v_status not in ('active', 'trialing') then
    return jsonb_build_object(
      'found', true, 'authorized', true, 'active_plan', null,
      'chatbot', jsonb_build_object(
        'id', v_chatbot.id, 'org_id', v_chatbot.org_id, 'name', v_chatbot.name,
        'company_name', v_chatbot.company_name, 'business_description', v_chatbot.business_description,
        'industry', v_chatbot.industry, 'tone', v_chatbot.tone, 'custom_prompt', v_chatbot.custom_prompt,
        'booking_url', v_chatbot.booking_url, 'fallback_message', v_chatbot.fallback_message
      )
    );
  end if;

  v_spent := public.get_monthly_ai_spend(v_chatbot.org_id);
  v_budget := (p_plan_budgets ->> v_plan)::numeric;

  return jsonb_build_object(
    'found', true,
    'authorized', true,
    'active_plan', v_plan,
    'spent_usd', v_spent,
    'budget_usd', v_budget,
    'chatbot', jsonb_build_object(
      'id', v_chatbot.id, 'org_id', v_chatbot.org_id, 'name', v_chatbot.name,
      'company_name', v_chatbot.company_name, 'business_description', v_chatbot.business_description,
      'industry', v_chatbot.industry, 'tone', v_chatbot.tone, 'custom_prompt', v_chatbot.custom_prompt,
      'booking_url', v_chatbot.booking_url, 'fallback_message', v_chatbot.fallback_message
    )
  );
end;
$$;

revoke execute on function public.chat_completion_gate(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.chat_completion_gate(uuid, uuid, jsonb) to service_role;
