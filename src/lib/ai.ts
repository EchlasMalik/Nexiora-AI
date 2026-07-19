import { supabase } from './supabase'
import { consumeSSEStream } from './sseStream'
import type { SuggestedQuestion } from '@/entities'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/**
 * The subset of a Chatbot's fields the widget UI and reply-streaming
 * functions actually need. A full `Chatbot` entity satisfies this
 * structurally, but so does the public-chatbot-config Edge Function's
 * response — which deliberately omits internal fields like custom_prompt
 * and business_description that shouldn't be exposed to anonymous visitors.
 */
export interface WidgetChatbot {
  id: string
  name: string
  welcome_message: string
  theme_color: string
  avatar_url: string
  suggested_questions: SuggestedQuestion[]
  fallback_message: string
  powered_by_branding: boolean
}

export interface GetReplyOptions {
  chatbot: WidgetChatbot
  history: ChatTurn[]
  /** Called with each text chunk as it streams in, for a live typewriter effect. */
  onDelta: (chunk: string) => void
  signal?: AbortSignal
}

/** Shape both the authenticated and public reply-streaming functions conform to. */
export type GetReplyFn = (options: GetReplyOptions) => Promise<string>

/**
 * Streams a real Claude reply from the `chat-completion` Edge Function
 * (supabase/functions/chat-completion), which holds the Anthropic API key
 * server-side and never exposes it to the browser.
 *
 * Requires an authenticated Supabase session — the Edge Function's default
 * JWT verification means this only works for signed-in users today (the
 * dashboard's Live Preview tab). The public embeddable widget uses
 * `streamPublicChatbotReply` (src/lib/publicAi.ts) instead.
 *
 * Resolves to the full assistant reply once streaming completes. On any
 * failure (network, missing ANTHROPIC_API_KEY secret, provider error) it
 * falls back to the chatbot's configured fallback message.
 */
export const streamChatbotReply: GetReplyFn = async ({ chatbot, history, onDelta, signal }) => {
  const fallback =
    chatbot.fallback_message || "Sorry, I'm having trouble responding right now. Please try again in a moment."

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return fallback
    }

    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ chatbotId: chatbot.id, history }),
      signal,
    })

    if (response.status === 402) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return body.error || fallback
    }
    if (!response.ok) return fallback
    const fullText = await consumeSSEStream(response, onDelta)
    return fullText || fallback
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return fallback
  }
}
