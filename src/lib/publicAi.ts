import type { ChatWidgetMessage } from '@/components/ChatWidget'
import type { GetReplyFn } from './ai'
import { consumeSSEStream } from './sseStream'

const SESSION_KEY = 'nexiora:widget_session_id'

export function getVisitorSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

/**
 * Fetches a returning visitor's prior conversation for a chatbot from the
 * anonymous `public-chat-history` Edge Function, keyed by the same
 * localStorage-backed session id `streamPublicChatbotReply` already sends.
 * Fails soft to an empty array on any error — the widget treats that
 * identically to a first-ever visit.
 */
export async function fetchChatHistory(chatbotId: string): Promise<ChatWidgetMessage[]> {
  try {
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-chat-history`
    const url = `${functionsUrl}?chatbot_id=${encodeURIComponent(chatbotId)}&session_id=${encodeURIComponent(getVisitorSessionId())}`
    const response = await fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
    if (!response.ok) return []

    const body = (await response.json()) as {
      messages?: { id: string; role: string; content: string; created_date: string }[]
    }
    return (body.messages ?? []).map((message) => ({
      id: message.id,
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
      created_date: message.created_date,
    }))
  } catch {
    return []
  }
}

/**
 * Streams a reply from the anonymous `public-chat` Edge Function — used by
 * the embeddable widget, where there's no Supabase session at all (real
 * website visitors, not signed-in dashboard users). Protected server-side by
 * rate limiting instead of auth. See supabase/functions/public-chat.
 */
export const streamPublicChatbotReply: GetReplyFn = async ({ chatbot, history, onDelta, signal }) => {
  const fallback =
    chatbot.fallback_message || "Sorry, I'm having trouble responding right now. Please try again in a moment."

  try {
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-chat`
    const response = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ chatbotId: chatbot.id, sessionId: getVisitorSessionId(), history }),
      signal,
    })

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}) as { error?: string })
      return body.error || "You've sent a lot of messages recently — please try again in a little while."
    }
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
