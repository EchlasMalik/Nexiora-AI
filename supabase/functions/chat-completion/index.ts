// Nexiora AI — chat-completion Edge Function (Phase 2: Real AI, Phase 3: RAG)
//
// Streams a Claude reply for a given chatbot + conversation history. Requires
// a valid Supabase session (default JWT verification) — this deliberately
// limits usage to signed-in users (the dashboard's Live Preview tab).
// The public embeddable widget uses the separate public-chat function
// instead, which has its own rate limiting since it's reachable anonymously.
//
// The chatbot lookup, membership check, billing gate, and spend-cap check
// run as one round trip via the `chat_completion_gate` RPC instead of four
// separate queries — same checks as before, same decision logic (which
// still lives here, passed into the RPC as parameters), just fewer trips.
//
// Deploy with: npx supabase functions deploy chat-completion
// Secrets:     npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... GEMINI_API_KEY=...
//              (Gemini is an optional free-tier fallback used only when the
//              Anthropic call fails — e.g. no credits — see streamAiReply)

import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  billingFallbackMessage,
  buildSystemPrompt,
  jsonError,
  logAiUsage,
  MONTHLY_AI_BUDGET_USD,
  retrieveKnowledge,
  spendCapMessage,
  streamAiReply,
  type ChatbotRow,
  type HistoryTurn,
  type PlanKey,
} from '../_shared/chat-core.ts'

declare const Supabase: {
  ai: { Session: new (model: string) => { run: (text: string, opts?: Record<string, unknown>) => Promise<unknown> } }
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Same embedding model used by embed-document — queries and stored chunks
// must come from the same model to compare meaningfully.
const embeddingModel = new Supabase.ai.Session('gte-small')

interface GateResult {
  found: boolean
  authorized?: boolean
  active_plan?: PlanKey | null
  spent_usd?: number
  budget_usd?: number
  chatbot?: ChatbotRow
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Missing authorization', 401)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser()
    if (authError || !user) {
      return jsonError('Invalid session', 401)
    }

    const { chatbotId, history } = (await req.json()) as { chatbotId?: string; history?: HistoryTurn[] }
    if (!chatbotId || !Array.isArray(history)) {
      return jsonError('chatbotId and history are required', 400)
    }

    const { data: gate, error: gateError } = await adminClient.rpc('chat_completion_gate', {
      p_chatbot_id: chatbotId,
      p_user_id: user.id,
      p_plan_budgets: MONTHLY_AI_BUDGET_USD,
    })
    if (gateError) {
      console.error('chat_completion_gate error', gateError)
      return jsonError('Internal error', 500)
    }

    const result = gate as GateResult
    if (!result.found) {
      return jsonError('Chatbot not found', 404)
    }
    if (!result.authorized) {
      return jsonError('Not authorized for this chatbot', 403)
    }
    if (!result.active_plan) {
      return jsonError(billingFallbackMessage(), 402)
    }
    if (result.spent_usd! >= result.budget_usd!) {
      return jsonError(spendCapMessage(result.active_plan, result.spent_usd!), 402)
    }

    if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) {
      return jsonError(
        'AI is not configured yet — add ANTHROPIC_API_KEY (and optionally GEMINI_API_KEY as a fallback) as an Edge Function secret.',
        503
      )
    }

    const chatbot = result.chatbot!
    const knowledgeText = await retrieveKnowledge(adminClient, embeddingModel, chatbotId, history)
    const systemPrompt = buildSystemPrompt(chatbot, knowledgeText)

    return await streamAiReply(ANTHROPIC_API_KEY, GEMINI_API_KEY, systemPrompt, history, async (_fullText, usage) => {
      await logAiUsage(adminClient, chatbot.org_id, chatbotId, usage.inputTokens, usage.outputTokens, usage.provider)
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
