// Nexiora AI — public-book-appointment Edge Function
//
// Anonymous endpoint the widget's native booking form posts to. Resolves the
// client-supplied chatbot_id to its org (never trusting a client-supplied
// org_id), rate-limits, and inserts a 'pending' appointment via the
// public_book_appointment RPC — same SECURITY DEFINER pattern as public-chat's
// gate/complete RPCs, used here because the write needs several
// server-trusted checks chained together (chatbot lookup, accepts_appointments
// gate, rate limit, conversation lookup, insert) in one round trip.
//
// The confirmation email is built and sent directly here via the shared
// template + sendEmail helper, rather than calling the authenticated
// send-appointment-confirmation function — that function requires a signed-in
// session and verifies org membership, which an anonymous visitor can never
// satisfy, and weakening that check would open up an unrelated authenticated
// action.
//
// Deploy with: npx supabase functions deploy public-book-appointment --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'
import { buildAppointmentConfirmationEmail } from '../_shared/appointmentEmail.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Booking is "try once, maybe retry" — not chat-volume traffic — so this is
// deliberately tighter than public-chat's visitor hourly limit (20).
const BOOKING_HOURLY_LIMIT = 5

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface BookingResult {
  found: boolean
  rate_limited?: boolean
  appointment_id?: string
  org_id?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const {
      chatbotId,
      sessionId,
      contactName,
      contactEmail,
      contactPhone,
      scheduledAt,
      timezone,
      notes,
    } = (await req.json()) as {
      chatbotId?: string
      sessionId?: string
      contactName?: string
      contactEmail?: string
      contactPhone?: string
      scheduledAt?: string
      timezone?: string
      notes?: string
    }

    if (!chatbotId || !sessionId || !contactName?.trim() || !scheduledAt) {
      return jsonError('chatbotId, sessionId, contactName, and scheduledAt are required', 400)
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: gate, error: gateError } = await adminClient.rpc('public_book_appointment', {
      p_chatbot_id: chatbotId,
      p_session_id: sessionId,
      p_contact_name: contactName.trim(),
      p_contact_email: contactEmail?.trim() ?? '',
      p_contact_phone: contactPhone?.trim() ?? '',
      p_scheduled_at: scheduledAt,
      p_timezone: timezone ?? '',
      p_notes: notes ?? '',
      p_hourly_limit: BOOKING_HOURLY_LIMIT,
    })
    if (gateError) {
      console.error('public_book_appointment error', gateError)
      return jsonError('Internal error', 500)
    }

    const result = gate as BookingResult
    if (!result.found) {
      return jsonError('Booking is not available for this chatbot', 404)
    }
    if (result.rate_limited) {
      return jsonError('Too many booking attempts — please try again later.', 429)
    }

    if (contactEmail?.trim()) {
      try {
        const { data: org } = await adminClient
          .from('orgs')
          .select('name')
          .eq('id', result.org_id)
          .maybeSingle()

        const { subject, html } = buildAppointmentConfirmationEmail({
          contactName: contactName.trim(),
          orgName: org?.name || 'Nexiora AI',
          scheduledAt,
          notes: notes ?? '',
        })
        await sendEmail({ to: contactEmail.trim(), subject, html })
      } catch (err) {
        // The appointment already exists — an email hiccup shouldn't undo it.
        console.error('booking confirmation email failed', err)
      }
    }

    return new Response(JSON.stringify({ success: true, appointmentId: result.appointment_id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
