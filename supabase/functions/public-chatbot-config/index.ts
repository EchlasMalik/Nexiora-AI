// Nexiora AI — public-chatbot-config Edge Function (Phase 4: Public widget)
//
// Anonymous, public endpoint: resolves a chatbot's public-safe config by its
// embed_id for the embeddable widget script. Deliberately returns only
// fields safe to expose to any third-party site — never custom_prompt,
// business_description, org_id, etc.
//
// Deploy with: npx supabase functions deploy public-chatbot-config --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const url = new URL(req.url)
    const embedId = url.searchParams.get('embed_id')
    if (!embedId) return jsonError('embed_id query param is required', 400)

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: chatbot, error } = await adminClient
      .from('chatbots')
      .select(
        'id, name, welcome_message, theme_color, avatar_url, logo_url, suggested_questions, links, faqs, position, powered_by_branding, fallback_message, booking_url, accepts_appointments, status'
      )
      .eq('embed_id', embedId)
      .maybeSingle()

    if (error || !chatbot || chatbot.status !== 'active') {
      return jsonError('Chatbot not found', 404)
    }

    const { status: _status, ...publicConfig } = chatbot

    return new Response(JSON.stringify(publicConfig), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
