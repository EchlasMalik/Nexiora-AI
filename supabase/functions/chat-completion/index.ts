// Nexiora AI — chat-completion Edge Function (Phase 2: Real AI, Phase 3: RAG)
//
// Streams a Claude reply for a given chatbot + conversation history. Requires
// a valid Supabase session (default JWT verification) — this deliberately
// limits usage to signed-in users (the dashboard's Live Preview tab).
// The public embeddable widget uses the separate public-chat function
// instead, which has its own rate limiting since it's reachable anonymously.
//
// Deploy with: npx supabase functions deploy chat-completion
// Secret:      npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { buildSystemPrompt, jsonError, retrieveKnowledge, streamClaudeReply, type ChatbotRow, type HistoryTurn } from '../_shared/chat-core.ts'

declare const Supabase: {
  ai: { Session: new (model: string) => { run: (text: string, opts?: Record<string, unknown>) => Promise<unknown> } }
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Same embedding model used by embed-document — queries and stored chunks
// must come from the same model to compare meaningfully.
const embeddingModel = new Supabase.ai.Session('gte-small')

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

    const { data: chatbot, error: chatbotError } = await adminClient
      .from('chatbots')
      .select('id, org_id, name, company_name, business_description, industry, tone, custom_prompt, booking_url, fallback_message')
      .eq('id', chatbotId)
      .maybeSingle<ChatbotRow>()
    if (chatbotError || !chatbot) {
      return jsonError('Chatbot not found', 404)
    }

    // Authorization: the caller must be a member of the org that owns this
    // chatbot. We fetched via the service role (bypassing RLS) above for a
    // single efficient lookup, so this check is not optional.
    const { data: membership } = await adminClient
      .from('memberships')
      .select('id')
      .eq('org_id', chatbot.org_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) {
      return jsonError('Not authorized for this chatbot', 403)
    }

    if (!ANTHROPIC_API_KEY) {
      return jsonError('AI is not configured yet — add ANTHROPIC_API_KEY as an Edge Function secret.', 503)
    }

    const knowledgeText = await retrieveKnowledge(adminClient, embeddingModel, chatbotId, history)
    const systemPrompt = buildSystemPrompt(chatbot, knowledgeText)

    return await streamClaudeReply(ANTHROPIC_API_KEY, systemPrompt, history)
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
