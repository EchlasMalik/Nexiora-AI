import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { ChatbotRepo, type Chatbot } from '@/entities'
import { ChatWidget } from '@/components/ChatWidget'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Button } from '@/components/ui/button'

const NAV_LINKS = ['Home', 'About', 'Pricing', 'Contact']

function SimulatedSite({ chatbot }: { chatbot: Chatbot }) {
  const brand = chatbot.company_name || chatbot.name

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-semibold text-brand-navy">{brand}</span>
          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm font-medium text-brand-text-secondary hover:text-brand-navy"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">Welcome to {brand}</h1>
          <p className="mt-4 text-lg text-brand-text-secondary">
            {chatbot.business_description || "We're glad you're here — take a look around."}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {['Our Services', 'Why Choose Us', 'Get in Touch'].map((title) => (
            <div key={title} className="rounded-2xl border border-border bg-slate-50 p-6">
              <div className="mb-4 h-24 rounded-xl bg-slate-200" />
              <h3 className="font-semibold text-brand-navy">{title}</h3>
              <p className="mt-1 text-sm text-brand-text-secondary">
                Placeholder content for this section of the {brand} website.
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-violet-100 bg-violet-50 px-6 py-4 text-center text-sm text-violet-700">
          👋 This is a live demo of the {chatbot.name} chat widget — try it using the button in the bottom-right
          corner.
        </div>
      </main>

      <ChatWidget chatbot={chatbot} variant="embedded" />
    </div>
  )
}

export default function LiveChat() {
  const { embedId } = useParams<{ embedId: string }>()

  const { data: chatbot, isLoading } = useQuery({
    queryKey: ['public-chatbot', embedId],
    queryFn: async () => {
      if (!embedId) return null
      const result = await ChatbotRepo.findPublicBy('embed_id', embedId)
      return result ?? null
    },
    enabled: !!embedId,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-violet-50 to-white">
        <LoadingSpinner />
      </div>
    )
  }

  if (!chatbot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-light-bg px-6 text-center">
        <Bot className="size-10 text-brand-text-secondary" />
        <h1 className="text-xl font-semibold text-brand-navy">Chatbot not found</h1>
        <p className="max-w-sm text-sm text-brand-text-secondary">
          This chatbot link isn't active. Create a chatbot from your dashboard to get a live embed link.
        </p>
        <Link to="/">
          <Button variant="outline" className="mt-2">
            Back home
          </Button>
        </Link>
      </div>
    )
  }

  return <SimulatedSite chatbot={chatbot} />
}
