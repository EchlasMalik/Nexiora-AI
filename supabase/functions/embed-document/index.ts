// Nexiora AI — embed-document Edge Function (Phase 3: Knowledge base RAG)
//
// Chunks a knowledge_documents row and embeds each chunk with Supabase's
// built-in `gte-small` model (runs in-process, no external API/key needed),
// storing vectors in knowledge_chunks for similarity search at chat time.
//
// Deploy with: npx supabase functions deploy embed-document

import { createClient } from 'jsr:@supabase/supabase-js@2'

declare const Supabase: {
  ai: { Session: new (model: string) => { run: (text: string, opts?: Record<string, unknown>) => Promise<unknown> } }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CHUNK_TARGET_SIZE = 500
const CHUNK_HARD_MAX = 750

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Paragraph-aware ~500-char chunker; hard-splits any single paragraph that's still too long. */
function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > CHUNK_TARGET_SIZE && current) {
      chunks.push(current.trim())
      current = paragraph
    } else {
      current = candidate
    }
    while (current.length > CHUNK_HARD_MAX) {
      chunks.push(current.slice(0, CHUNK_TARGET_SIZE).trim())
      current = current.slice(CHUNK_TARGET_SIZE)
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean)
}

const embeddingModel = new Supabase.ai.Session('gte-small')

async function embed(text: string): Promise<number[]> {
  const output = await embeddingModel.run(text, { mean_pool: true, normalize: true })
  return output as number[]
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

    const { documentId } = (await req.json()) as { documentId?: string }
    if (!documentId) return jsonError('documentId is required', 400)

    const { data: document, error: documentError } = await adminClient
      .from('knowledge_documents')
      .select('id, org_id, chatbot_id, content')
      .eq('id', documentId)
      .maybeSingle()
    if (documentError || !document) return jsonError('Document not found', 404)

    const { data: membership } = await adminClient
      .from('memberships')
      .select('id')
      .eq('org_id', document.org_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonError('Not authorized for this document', 403)

    try {
      // Re-processing (e.g. retry after failure) should replace old chunks, not append.
      await adminClient.from('knowledge_chunks').delete().eq('document_id', documentId)

      const chunks = chunkText(document.content ?? '')
      if (chunks.length === 0) {
        await adminClient
          .from('knowledge_documents')
          .update({ status: 'ready', chunk_count: 0 })
          .eq('id', documentId)
        return new Response(JSON.stringify({ chunkCount: 0 }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const rows = []
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embed(chunks[i])
        rows.push({
          org_id: document.org_id,
          chatbot_id: document.chatbot_id,
          document_id: documentId,
          chunk_index: i,
          content: chunks[i],
          embedding: JSON.stringify(embedding),
        })
      }

      const { error: insertError } = await adminClient.from('knowledge_chunks').insert(rows)
      if (insertError) throw new Error(insertError.message)

      await adminClient
        .from('knowledge_documents')
        .update({ status: 'ready', chunk_count: rows.length })
        .eq('id', documentId)

      return new Response(JSON.stringify({ chunkCount: rows.length }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    } catch (processingError) {
      console.error('Indexing failed', processingError)
      await adminClient.from('knowledge_documents').update({ status: 'failed', chunk_count: 0 }).eq('id', documentId)
      return jsonError('Indexing failed', 500)
    }
  } catch (err) {
    console.error(err)
    return jsonError('Internal error', 500)
  }
})
