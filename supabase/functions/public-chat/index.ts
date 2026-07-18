// Nexiora AI — public-chat Edge Function (Phase 4: Public widget)
//
// Anonymous chat endpoint for the embeddable widget. No Supabase session
// required — protected instead by server-side rate limiting (per-visitor
// and per-chatbot caps), since anyone on the internet can reach this once a
// chatbot's embed script is live on a real site.
//
// Every real exchange is persisted as a Conversation + Message rows (keyed
// by chatbot_id + the widget's stable per-browser sessionId as visitor_id),
// so it shows up in the dashboard inbox exactly like a conversation started
// from anywhere else — this endpoint used to just stream a reply and forget
// it ever happened.
//
// Deploy with: npx supabase functions deploy public-chat --no-verify-jwt
// Secret:      shares ANTHROPIC_API_KEY with chat-completion (already set there)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  buildSystemPrompt,
  jsonError,
  retrieveKnowledge,
  streamClaudeReply,
  type ChatbotRow,
  type HistoryTurn,
} from '../_shared/chat-core.ts'

declare const Supabase: {
  ai: { Session: new (model: string) => { run: (text: string, opts?: Record<string, unknown>) => Promise<unknown> } }
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const embeddingModel = new Supabase.ai.Session('gte-small')

// Deliberately message-count based rather than true token/cost accounting —
// a simple, effective first line of defense. Revisit with real per-org
// token budgets if a chatbot's usage pattern demands finer-grained control.
const VISITOR_HOURLY_LIMIT = 20
const CHATBOT_DAILY_LIMIT = 500

// deno-lint-ignore no-explicit-any
async function findOrCreateConversation(adminClient: any, orgId: string, chatbotId: string, visitorId: string) {
  const { data: existing } = await adminClient
    .from('conversations')
    .select('id')
    .eq('chatbot_id', chatbotId)
    .eq('visitor_id', visitorId)
    .maybeSingle()

  if (existing) {
    // Any new visitor message means there's something an operator hasn't
    // seen yet, regardless of whether the conversation is still AI-managed.
    await adminClient.from('conversations').update({ unread: true }).eq('id', existing.id)
    return existing.id as string
  }

  const { data: created, error } = await adminClient
    .from('conversations')
    .insert({ org_id: orgId, chatbot_id: chatbotId, visitor_id: visitorId, status: 'ai', unread: true })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return created.id as string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { chatbotId, sessionId, history } = (await req.json()) as {
      chatbotId?: string
      sessionId?: string
      history?: HistoryTurn[]
    }
    if (!chatbotId || !sessionId || !Array.isArray(history)) {
      return jsonError('chatbotId, sessionId, and history are required', 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: chatbot, error: chatbotError } = await adminClient
      .from('chatbots')
      .select(
        'id, org_id, name, company_name, business_description, industry, tone, custom_prompt, booking_url, fallback_message, status'
      )
      .eq('id', chatbotId)
      .maybeSingle<ChatbotRow & { status: string }>()
    if (chatbotError || !chatbot || chatbot.status !== 'active') {
      return jsonError('Chatbot not found', 404)
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: visitorCount } = await adminClient
      .from('widget_messages')
      .select('id', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .eq('visitor_session', sessionId)
      .gte('created_date', oneHourAgo)
    if ((visitorCount ?? 0) >= VISITOR_HOURLY_LIMIT) {
      return jsonError("You've sent a lot of messages recently — please try again in a little while.", 429)
    }

    const { count: chatbotCount } = await adminClient
      .from('widget_messages')
      .select('id', { count: 'exact', head: true })
      .eq('chatbot_id', chatbotId)
      .gte('created_date', oneDayAgo)
    if ((chatbotCount ?? 0) >= CHATBOT_DAILY_LIMIT) {
      return jsonError('This chatbot has reached its daily message limit — please try again tomorrow.', 429)
    }

    // Record this attempt before calling Claude, so retries/failures still count toward the caps.
    await adminClient.from('widget_messages').insert({ chatbot_id: chatbotId, visitor_session: sessionId })

    const conversationId = await findOrCreateConversation(adminClient, chatbot.org_id, chatbotId, sessionId)

    const lastUserTurn = [...history].reverse().find((turn) => turn.role === 'user')
    if (lastUserTurn?.content) {
      await adminClient.from('messages').insert({
        org_id: chatbot.org_id,
        conversation_id: conversationId,
        role: 'user',
        content: lastUserTurn.content,
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonError('AI is not configured yet.', 503)
    }

    const knowledgeText = await retrieveKnowledge(adminClient, embeddingModel, chatbotId, history)
    const systemPrompt = buildSystemPrompt(chatbot, knowledgeText)

    return await streamClaudeReply(ANTHROPIC_API_KEY, systemPrompt, history, async (fullText) => {
      if (!fullText.trim()) return
      await adminClient.from('messages').insert({
        org_id: chatbot.org_id,
        conversation_id: conversationId,
        role: 'assistant',
        content: fullText,
      })
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
