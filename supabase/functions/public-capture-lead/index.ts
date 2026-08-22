// Nexiora AI — public-capture-lead Edge Function
//
// Anonymous endpoint the widget's native "Leave your details" form posts to.
// Same shape as public-book-appointment: resolves the client-supplied
// chatbot_id to its org (never trusting a client-supplied org_id),
// rate-limits, and inserts a 'new' contact via the public_capture_lead RPC.
//
// No visitor-facing email here — unlike a booking, there's no scheduled time
// to remind them of, just an in-widget "we'll be in touch" success state.
// The business is notified instead, via the shared notifyOrgOwner helper.
//
// Deploy with: npx supabase functions deploy public-capture-lead --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { notifyOrgOwner } from '../_shared/ownerNotification.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// "Leave your details once, maybe retry" — not chat-volume traffic — same
// reasoning as public-book-appointment's tighter-than-chat limit.
const LEAD_HOURLY_LIMIT = 5

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface CaptureResult {
  found: boolean
  rate_limited?: boolean
  contact_id?: string
  org_id?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { chatbotId, sessionId, name, email, phone, requirements } = (await req.json()) as {
      chatbotId?: string
      sessionId?: string
      name?: string
      email?: string
      phone?: string
      requirements?: string
    }

    if (!chatbotId || !sessionId || !name?.trim()) {
      return jsonError('chatbotId, sessionId, and name are required', 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: gate, error: gateError } = await adminClient.rpc('public_capture_lead', {
      p_chatbot_id: chatbotId,
      p_session_id: sessionId,
      p_name: name.trim(),
      p_email: email?.trim() ?? '',
      p_phone: phone?.trim() ?? '',
      p_requirements: requirements ?? '',
      p_hourly_limit: LEAD_HOURLY_LIMIT,
    })
    if (gateError) {
      console.error('public_capture_lead error', gateError)
      return jsonError('Internal error', 500)
    }

    const result = gate as CaptureResult
    if (!result.found) {
      return jsonError('Lead capture is not available for this chatbot', 404)
    }
    if (result.rate_limited) {
      return jsonError('Too many attempts — please try again later.', 429)
    }

    try {
      await notifyOrgOwner(adminClient, {
        orgId: result.org_id!,
        kind: 'new_lead',
        contactName: name.trim(),
        detailLine: requirements?.trim()
          ? `Message: ${requirements.trim()}`
          : `Contact: ${email?.trim() || phone?.trim() || 'no contact details left'}`,
      })
    } catch (err) {
      console.error('owner notification failed', err)
    }

    return new Response(JSON.stringify({ success: true, contactId: result.contact_id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
