import { useEffect, useState } from 'react'
import { ChatWidget } from '@/components/ChatWidget'
import { streamPublicChatbotReply } from '@/lib/publicAi'
import type { WidgetChatbot } from '@/lib/ai'

interface PublicWidgetLoaderProps {
  embedId: string
}

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; chatbot: WidgetChatbot }

export function PublicWidgetLoader({ embedId }: PublicWidgetLoaderProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-chatbot-config?embed_id=${encodeURIComponent(embedId)}`
        const response = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        })
        if (!response.ok) throw new Error('Chatbot not found')
        const chatbot = (await response.json()) as WidgetChatbot
        if (!cancelled) setState({ status: 'ready', chatbot })
      } catch {
        if (!cancelled) setState({ status: 'error' })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [embedId])

  // Loading and not-found states render nothing — a widget script shouldn't
  // show anything on the host page until it has a real chatbot to offer, and
  // definitely shouldn't error-splash on someone else's site.
  if (state.status !== 'ready') return null

  return <ChatWidget chatbot={state.chatbot} variant="embedded" getReply={streamPublicChatbotReply} />
}
