import { supabase } from './supabase'

/**
 * Triggers real chunking + embedding for a knowledge document via the
 * embed-document Edge Function. The document should already exist with
 * status 'processing' — this call transitions it to 'ready' (or 'failed').
 */
export async function indexKnowledgeDocument(documentId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('Not signed in')
  }

  const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-document`
  const response = await fetch(functionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ documentId }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string })
    throw new Error(body.error || `Indexing failed (${response.status})`)
  }
}
