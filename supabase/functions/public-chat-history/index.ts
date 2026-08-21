// Nexiora AI — public-chat-history Edge Function
//
// Anonymous, read-only endpoint: returns a returning visitor's prior message
// history for a chatbot, so the embeddable widget can restore their old
// conversation instead of always starting fresh. Looked up by
// (chatbot_id, session_id) — session_id is the widget's localStorage-backed
// visitor id, the same key public_chat_gate already uses to find-or-create
// the conversation row, so this never creates anything, it only reads.
//
// A pure read with no write/business-logic branching, so this follows the
// public-chatbot-config pattern (plain service-role admin client) rather
// than public-chat's SECURITY DEFINER RPC pattern (which exists for writes).
//
// Deploy with: npx supabase functions deploy public-chat-history --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { CORS_HEADERS, jsonError } from '../_shared/chat-core.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const HISTORY_LIMIT = 50

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const url = new URL(req.url)
    const chatbotId = url.searchParams.get('chatbot_id')
    const sessionId = url.searchParams.get('session_id')
    if (!chatbotId || !sessionId) {
      return jsonError('chatbot_id and session_id query params are required', 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: conversation } = await adminClient
      .from('conversations')
      .select('id')
      .eq('chatbot_id', chatbotId)
      .eq('visitor_id', sessionId)
      .maybeSingle()

    // No conversation for this (chatbot, visitor) pair — a first-ever visit,
    // or an unrecognized id. Respond the same as "no history" either way,
    // rather than a 404, so this never confirms/denies what exists.
    if (!conversation) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: rows } = await adminClient
      .from('messages')
      .select('id, role, content, created_date')
      .eq('conversation_id', conversation.id)
      .order('created_date', { ascending: false })
      .limit(HISTORY_LIMIT)

    const messages = ((rows ?? []) as { id: string; role: string; content: string; created_date: string }[])
      .reverse()
      .map((row) => ({
        id: row.id,
        // An operator (human agent) taking over from the dashboard inbox is
        // rendered identically to the assistant in the widget — it has no
        // concept of a third role.
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content,
      }))

    return new Response(JSON.stringify({ messages }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
