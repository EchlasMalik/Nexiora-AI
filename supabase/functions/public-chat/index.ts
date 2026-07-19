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
// from anywhere else.
//
// Everything before and after the Claude call — the chatbot lookup, both
// rate-limit checks, logging the attempt, finding/creating the conversation,
// persisting the visitor's message, the billing gate, and the spend-cap
// check — runs as one round trip via the `public_chat_gate` RPC instead of
// eight separate queries. The two post-reply writes (usage log + assistant
// message) are similarly batched into `public_chat_complete`. The actual
// gating thresholds and fallback copy still live here in TypeScript and are
// passed into the RPC as parameters — the SQL function is just where the
// same checks execute, not where they're decided.
//
// Deploy with: npx supabase functions deploy public-chat --no-verify-jwt
// Secret:      shares ANTHROPIC_API_KEY with chat-completion (already set there)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  buildSystemPrompt,
  estimateCostUsd,
  GENERIC_FALLBACK_MESSAGE,
  jsonError,
  MONTHLY_AI_BUDGET_USD,
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

interface GateResult {
  found: boolean
  rate_limited?: 'visitor' | 'chatbot'
  gated?: boolean
  fallback_text?: string
  conversation_id?: string
  chatbot?: ChatbotRow
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

    const lastUserTurn = [...history].reverse().find((turn) => turn.role === 'user')

    const { data: gate, error: gateError } = await adminClient.rpc('public_chat_gate', {
      p_chatbot_id: chatbotId,
      p_session_id: sessionId,
      p_user_message: lastUserTurn?.content ?? null,
      p_visitor_hourly_limit: VISITOR_HOURLY_LIMIT,
      p_chatbot_daily_limit: CHATBOT_DAILY_LIMIT,
      p_plan_budgets: MONTHLY_AI_BUDGET_USD,
      p_generic_fallback: GENERIC_FALLBACK_MESSAGE,
    })
    if (gateError) {
      console.error('public_chat_gate error', gateError)
      return jsonError('Internal error', 500)
    }

    const result = gate as GateResult
    if (!result.found) {
      return jsonError('Chatbot not found', 404)
    }
    if (result.rate_limited === 'visitor') {
      return jsonError("You've sent a lot of messages recently — please try again in a little while.", 429)
    }
    if (result.rate_limited === 'chatbot') {
      return jsonError('This chatbot has reached its daily message limit — please try again tomorrow.', 429)
    }
    if (result.gated) {
      // No active plan or over this month's AI budget — the RPC already
      // persisted this exact text as the assistant's reply, so the visitor
      // sees a normal-looking answer, never anything about billing.
      return jsonError(result.fallback_text!, 402)
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonError('AI is not configured yet.', 503)
    }

    const chatbot = result.chatbot!
    const conversationId = result.conversation_id!

    const knowledgeText = await retrieveKnowledge(adminClient, embeddingModel, chatbotId, history)
    const systemPrompt = buildSystemPrompt(chatbot, knowledgeText)

    return await streamClaudeReply(ANTHROPIC_API_KEY, systemPrompt, history, async (fullText, usage) => {
      const { error } = await adminClient.rpc('public_chat_complete', {
        p_org_id: chatbot.org_id,
        p_chatbot_id: chatbotId,
        p_conversation_id: conversationId,
        p_input_tokens: usage.inputTokens,
        p_output_tokens: usage.outputTokens,
        p_estimated_cost_usd: estimateCostUsd(usage.inputTokens, usage.outputTokens),
        p_reply_text: fullText,
      })
      if (error) console.error('public_chat_complete error', error)
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
