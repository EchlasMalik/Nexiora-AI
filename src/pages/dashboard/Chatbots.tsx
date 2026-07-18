import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { Bot, Plus, Search } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo } from '@/entities'
import { DashboardLayout } from '@/components/DashboardLayout'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChatbotCard } from '@/components/chatbots/ChatbotCard'
import { CreateWizard } from '@/components/chatbots/CreateWizard'

export default function Chatbots() {
  const { orgId } = useOrg()
  const [search, setSearch] = useState('')
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data: chatbots = [], isLoading } = useQuery({
    queryKey: ['chatbots', orgId],
    queryFn: () => ChatbotRepo.list(orgId!),
    enabled: !!orgId,
  })

  const filteredChatbots = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return chatbots
    return chatbots.filter(
      (bot) =>
        bot.name.toLowerCase().includes(query) || bot.company_name.toLowerCase().includes(query)
    )
  }, [chatbots, search])

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">Chatbots</h1>
          <p className="mt-1 text-sm text-brand-text-secondary">Create and manage your AI chatbots.</p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          New Chatbot
        </Button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-text-secondary" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chatbots…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : chatbots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Bot className="size-6" />
          </div>
          <p className="max-w-sm text-sm text-brand-text-secondary">
            You haven't created a chatbot yet. Launch your first one to start capturing leads.
          </p>
          <Button onClick={() => setWizardOpen(true)} className="mt-1 gap-1.5">
            <Plus className="size-4" />
            Create your first chatbot
          </Button>
        </div>
      ) : filteredChatbots.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white py-16 text-center text-sm text-brand-text-secondary">
          No chatbots match "{search}".
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChatbots.map((bot) => (
            <ChatbotCard key={bot.id} chatbot={bot} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {wizardOpen && <CreateWizard onClose={() => setWizardOpen(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  )
}
