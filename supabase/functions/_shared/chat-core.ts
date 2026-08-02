// Shared chat logic used by both chat-completion (authenticated, dashboard
// Live Preview) and public-chat (anonymous, embeddable widget). Keeping this
// in one place means the two callers can never drift on prompt construction,
// RAG retrieval, or how the Claude stream gets relayed.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const TONE_GUIDANCE: Record<string, string> = {
  friendly: 'Warm, casual, and approachable.',
  professional: 'Polished, formal, and to the point.',
  luxury: 'Refined and elevated, white-glove service.',
  playful: 'Fun and energetic, a little cheeky — use emoji sparingly.',
  supportive: 'Empathetic and patient, here to help.',
  sales: 'Enthusiastic and persuasive, gently drives toward booking a call.',
}

export interface ChatbotRow {
  id: string
  org_id: string
  name: string
  company_name: string
  business_description: string
  industry: string
  tone: string
  custom_prompt: string
  booking_url: string
  fallback_message: string
}

export interface HistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

// deno-lint-ignore no-explicit-any
type AdminClient = any

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// Public marketing site URL, used only to build the "go activate a plan"
// link below — override with a Supabase secret once a custom domain is set.
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://nexiora-ai-agent.vercel.app'

export const GENERIC_FALLBACK_MESSAGE =
  "Sorry, I'm having trouble responding right now. Please try again in a moment."

/**
 * Owner-facing only — names the actual billing problem and links to fix it.
 * Used by chat-completion (the dashboard's own Live Preview, authenticated,
 * only ever seen by someone on the org). Never used by public-chat: a real
 * site visitor must never learn that the business hasn't paid, so that path
 * shows the chatbot's own configured fallback_message instead.
 */
export function billingFallbackMessage(): string {
  return `This chatbot is currently inactive because its plan hasn't been activated yet. If you're the business owner, you can activate a plan here: ${SITE_URL}/#pricing`
}

export type PlanKey = 'starter' | 'growth' | 'business' | 'enterprise'

// Rough Claude Sonnet-class pricing, per token — verify against
// https://www.anthropic.com/pricing before relying on this for real
// accounting; it's meant to bound worst-case spend, not to be exact to the
// cent. Adjust here if pricing changes or a different model is used.
const PRICE_PER_INPUT_TOKEN_USD = 3 / 1_000_000
const PRICE_PER_OUTPUT_TOKEN_USD = 15 / 1_000_000

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return inputTokens * PRICE_PER_INPUT_TOKEN_USD + outputTokens * PRICE_PER_OUTPUT_TOKEN_USD
}

// Monthly AI spend ceiling per plan, in USD (Anthropic bills in USD
// regardless of what currency the plan itself is priced in). Sized to keep
// worst-case gross margin reasonable against each plan's GBP price even if a
// customer maxes out their budget every month — not just "well above typical
// usage" like the original pass, which left Business too thin (~11% margin
// at ~£199/$253) once Stripe fees and infra costs are factored in.
export const MONTHLY_AI_BUDGET_USD: Record<PlanKey, number> = {
  starter: 15,
  growth: 50,
  business: 150,
  enterprise: 750,
}

/** Owner-facing only, same reasoning as billingFallbackMessage — never shown to a site visitor. */
export function spendCapMessage(plan: PlanKey, spentUsd: number): string {
  const budget = MONTHLY_AI_BUDGET_USD[plan]
  return `This chatbot has used its AI budget for the ${plan} plan this month ($${spentUsd.toFixed(2)} / $${budget.toFixed(2)}). It'll reset next month, or you can upgrade your plan for a higher budget.`
}

/**
 * Logs real token usage from a completed AI call for spend-cap accounting.
 * Gemini is only ever used as a free-tier fallback, so it's logged at $0
 * regardless of token count — only Anthropic usage counts against budget.
 */
export async function logAiUsage(
  adminClient: AdminClient,
  orgId: string,
  chatbotId: string,
  inputTokens: number,
  outputTokens: number,
  provider: AiProvider = 'anthropic'
): Promise<void> {
  await adminClient.from('ai_usage_log').insert({
    org_id: orgId,
    chatbot_id: chatbotId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: provider === 'gemini' ? 0 : estimateCostUsd(inputTokens, outputTokens),
  })
}

export function buildSystemPrompt(chatbot: ChatbotRow, knowledgeText: string): string {
  const toneDescription = TONE_GUIDANCE[chatbot.tone] ?? TONE_GUIDANCE.professional
  const parts = [
    `You are ${chatbot.name}, the AI assistant for ${chatbot.company_name || 'this business'}.`,
    chatbot.business_description ? `Business context: ${chatbot.business_description}` : '',
    chatbot.industry ? `Industry: ${chatbot.industry}` : '',
    `Tone: ${toneDescription}`,
    chatbot.custom_prompt ? `Additional instructions from the business owner: ${chatbot.custom_prompt}` : '',
    chatbot.booking_url
      ? `If the visitor wants to book a call or meeting, share this link: ${chatbot.booking_url}`
      : '',
    knowledgeText
      ? `Here are the most relevant excerpts from your knowledge base for the visitor's latest message. Answer from these if they cover it; if they don't, say so honestly rather than guessing:\n\n${knowledgeText}`
      : "No knowledge base excerpts matched this question (either none is configured yet, or nothing relevant was found) — answer helpfully from general knowledge and invite the visitor to leave their contact details for a follow-up.",
    'Keep replies concise and conversational — a few sentences, suited for a chat widget, not a long essay.',
    "Reply in the same language the visitor is writing in, even if this prompt is in English — don't ask which language to use, just match theirs. If a conversation mixes languages, follow the visitor's most recent message. Default to English only if their language is unclear (e.g. a single word or emoji).",
  ]
  return parts.filter(Boolean).join('\n\n')
}

const MATCH_COUNT = 5
const SIMILARITY_THRESHOLD = 0.3

/** Embeds the visitor's latest message and retrieves the most relevant knowledge base chunks. */
export async function retrieveKnowledge(
  adminClient: AdminClient,
  embeddingModel: { run: (text: string, opts?: Record<string, unknown>) => Promise<unknown> },
  chatbotId: string,
  history: HistoryTurn[]
): Promise<string> {
  const lastUserTurn = [...history].reverse().find((turn) => turn.role === 'user')
  if (!lastUserTurn) return ''

  const queryEmbedding = (await embeddingModel.run(lastUserTurn.content, {
    mean_pool: true,
    normalize: true,
  })) as number[]

  const { data: matches, error } = await adminClient.rpc('match_knowledge_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_chatbot_id: chatbotId,
    match_count: MATCH_COUNT,
  })

  if (error) {
    console.error('match_knowledge_chunks error', error)
    return ''
  }

  return ((matches ?? []) as { content: string; similarity: number }[])
    .filter((match) => match.similarity >= SIMILARITY_THRESHOLD)
    .map((match) => match.content)
    .join('\n\n---\n\n')
}

export type AiProvider = 'anthropic' | 'gemini'

export interface AiUsage {
  inputTokens: number
  outputTokens: number
  provider: AiProvider
}

// Free-tier Gemini model used only as a fallback when Anthropic is
// unreachable or out of credits — swap if Google renames/retires this model.
const GEMINI_MODEL = 'gemini-2.5-flash'

interface StreamEvent {
  text?: string
  inputTokens?: number
  outputTokens?: number
}

/** Parses Claude's SSE stream into plain text/usage events. */
async function* parseAnthropicStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const evt of events) {
      const dataLine = evt.split('\n').find((line) => line.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice(6)
      try {
        const parsed = JSON.parse(payload)
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          yield { text: parsed.delta.text }
        } else if (parsed.type === 'message_start' && parsed.message?.usage) {
          // Real input token count for this call — includes the full
          // system prompt + RAG context + history, reported once up front.
          yield { inputTokens: parsed.message.usage.input_tokens ?? 0 }
        } else if (parsed.type === 'message_delta' && parsed.usage) {
          // Cumulative output tokens so far; the last one before
          // message_stop is the final total for the reply.
          yield { outputTokens: parsed.usage.output_tokens ?? 0 }
        }
      } catch {
        // Ignore malformed/partial SSE chunks — the next read fills them in.
      }
    }
  }
}

/** Parses Gemini's SSE stream (alt=sse) into the same plain text/usage events. */
async function* parseGeminiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const evt of events) {
      const dataLine = evt.split('\n').find((line) => line.startsWith('data: '))
      if (!dataLine) continue
      const payload = dataLine.slice(6)
      try {
        const parsed = JSON.parse(payload)
        const text = (parsed.candidates?.[0]?.content?.parts ?? [])
          .map((part: { text?: string }) => part.text ?? '')
          .join('')
        if (text) yield { text }
        // Gemini reports cumulative usage on each chunk; the last one wins.
        if (parsed.usageMetadata) {
          yield {
            inputTokens: parsed.usageMetadata.promptTokenCount ?? 0,
            outputTokens: parsed.usageMetadata.candidatesTokenCount ?? 0,
          }
        }
      } catch {
        // Ignore malformed/partial SSE chunks — the next read fills them in.
      }
    }
  }
}

/** Relays a provider-agnostic event stream as `data: {text}` SSE, same shape either provider produces. */
function relayAsSse(
  source: AsyncGenerator<StreamEvent>,
  provider: AiProvider,
  onComplete?: (fullText: string, usage: AiUsage) => void | Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullText = ''
      let inputTokens = 0
      let outputTokens = 0

      try {
        for await (const evt of source) {
          if (evt.text) {
            fullText += evt.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: evt.text })}\n\n`))
          }
          if (evt.inputTokens !== undefined) inputTokens = evt.inputTokens
          if (evt.outputTokens !== undefined) outputTokens = evt.outputTokens
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('Stream error', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
      } finally {
        controller.close()
        try {
          await onComplete?.(fullText, { inputTokens, outputTokens, provider })
        } catch (err) {
          console.error('relayAsSse onComplete failed', err)
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Calls Claude first; if it's unreachable, out of credits, or otherwise
 * errors on the initial request (bad key, rate limit, overload, etc.),
 * falls back to Gemini's free-tier flash model instead. Either provider's
 * reply is relayed identically as `data: {text}` SSE events, so callers and
 * the frontend never need to know which one actually answered.
 *
 * `onComplete` (if given) fires once with whatever text was accumulated,
 * the real token usage the winning provider reported, and which provider
 * it was — on a clean finish or a mid-stream error alike — so a caller can
 * persist the reply (even a partial one) and log accurate spend.
 */
export async function streamAiReply(
  anthropicApiKey: string | undefined,
  geminiApiKey: string | undefined,
  systemPrompt: string,
  history: HistoryTurn[],
  onComplete?: (fullText: string, usage: AiUsage) => void | Promise<void>
): Promise<Response> {
  if (anthropicApiKey) {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: history.map((turn) => ({
          role: turn.role === 'assistant' ? 'assistant' : 'user',
          content: turn.content,
        })),
        stream: true,
      }),
    }).catch((err) => {
      console.error('Anthropic request failed, falling back to Gemini', err)
      return null
    })

    if (anthropicResponse?.ok && anthropicResponse.body) {
      return relayAsSse(parseAnthropicStream(anthropicResponse.body), 'anthropic', onComplete)
    }

    if (anthropicResponse) {
      const errText = await anthropicResponse.text().catch(() => '')
      console.error(
        'Anthropic error, falling back to Gemini:',
        anthropicResponse.status,
        errText
      )
    }
  }

  if (!geminiApiKey) {
    return jsonError('AI provider error', 502)
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: history.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  ).catch((err) => {
    console.error('Gemini request failed', err)
    return null
  })

  if (!geminiResponse?.ok || !geminiResponse.body) {
    const errText = await geminiResponse?.text().catch(() => '')
    console.error('Gemini error', geminiResponse?.status, errText)
    return jsonError('AI provider error', 502)
  }

  return relayAsSse(parseGeminiStream(geminiResponse.body), 'gemini', onComplete)
}
