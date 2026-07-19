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

/** Logs real token usage from a completed Claude call for spend-cap accounting. */
export async function logAiUsage(
  adminClient: AdminClient,
  orgId: string,
  chatbotId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  await adminClient.from('ai_usage_log').insert({
    org_id: orgId,
    chatbot_id: chatbotId,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: estimateCostUsd(inputTokens, outputTokens),
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

export interface ClaudeUsage {
  inputTokens: number
  outputTokens: number
}

/**
 * Calls Claude with streaming enabled and relays it as simple `data: {text}`
 * SSE events. `onComplete` (if given) fires once with whatever text was
 * accumulated and the real token usage Anthropic reported — on a clean
 * finish or a mid-stream error alike — so a caller can persist the reply
 * (even a partial one) and log accurate spend rather than losing either.
 */
export async function streamClaudeReply(
  anthropicApiKey: string,
  systemPrompt: string,
  history: HistoryTurn[],
  onComplete?: (fullText: string, usage: ClaudeUsage) => void | Promise<void>
): Promise<Response> {
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
  })

  if (!anthropicResponse.ok || !anthropicResponse.body) {
    const errText = await anthropicResponse.text().catch(() => '')
    console.error('Anthropic error', anthropicResponse.status, errText)
    return jsonError('AI provider error', 502)
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicResponse.body!.getReader()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      let buffer = ''
      let fullText = ''
      let inputTokens = 0
      let outputTokens = 0

      try {
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
                fullText += parsed.delta.text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`))
              } else if (parsed.type === 'message_start' && parsed.message?.usage) {
                // Real input token count for this call — includes the full
                // system prompt + RAG context + history, reported once up front.
                inputTokens = parsed.message.usage.input_tokens ?? 0
              } else if (parsed.type === 'message_delta' && parsed.usage) {
                // Cumulative output tokens so far; the last one before
                // message_stop is the final total for the reply.
                outputTokens = parsed.usage.output_tokens ?? outputTokens
              }
            } catch {
              // Ignore malformed/partial SSE chunks — the next read fills them in.
            }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('Stream error', err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
      } finally {
        controller.close()
        try {
          await onComplete?.(fullText, { inputTokens, outputTokens })
        } catch (err) {
          console.error('streamClaudeReply onComplete failed', err)
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
