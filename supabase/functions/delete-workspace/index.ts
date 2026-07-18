// Nexiora AI — delete-workspace Edge Function (GDPR right-to-erasure)
//
// Permanently deletes the caller's org (cascading to every entity table —
// chatbots, conversations, messages, contacts, appointments, knowledge docs
// and chunks — via ON DELETE CASCADE) and the caller's auth user. Runs with
// the service role because there's deliberately no RLS DELETE policy on
// `orgs` for regular clients — a destructive, irreversible operation like
// this should only ever go through a controlled server-side path, not a
// direct client-side query.
//
// Deploy with: npx supabase functions deploy delete-workspace

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonError('Missing authorization', 401)

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await callerClient.auth.getUser()
    if (authError || !user) return jsonError('Invalid session', 401)

    const { data: membership, error: membershipError } = await adminClient
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (membershipError || !membership) return jsonError('No workspace found for this account', 404)
    if (membership.role !== 'owner') {
      return jsonError('Only the workspace owner can delete it', 403)
    }

    // Cascades to chatbots, conversations, messages, contacts, appointments,
    // knowledge_documents, knowledge_chunks, memberships, and subscriptions.
    const { error: deleteOrgError } = await adminClient.from('orgs').delete().eq('id', membership.org_id)
    if (deleteOrgError) {
      console.error('Failed to delete org', deleteOrgError)
      return jsonError('Failed to delete workspace data', 500)
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteUserError) {
      console.error('Failed to delete auth user', deleteUserError)
      // Org data is already gone at this point — surface a distinct message
      // so support can find and clean up the orphaned auth user if needed.
      return jsonError('Workspace data was deleted, but the account itself could not be removed. Contact support.', 500)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
