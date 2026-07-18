import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { ChatbotRepo, KnowledgeDocumentRepo } from '@/entities'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { KnowledgeTab } from '@/components/chatbots/detail/KnowledgeTab'
import { cn } from '@/lib/utils'

export default function KnowledgeBase() {
  const { orgId } = useOrg()
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null)

  const { data: chatbots = [], isLoading: chatbotsLoading } = useQuery({
    queryKey: ['chatbots', orgId],
    queryFn: () => ChatbotRepo.list(orgId!),
    enabled: !!orgId,
  })

  useEffect(() => {
    if (!selectedBotId && chatbots.length > 0) {
      setSelectedBotId(chatbots[0].id)
    }
  }, [chatbots, selectedBotId])

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['knowledge-documents', orgId, selectedBotId],
    queryFn: () => KnowledgeDocumentRepo.filter(orgId!, { chatbot_id: selectedBotId! }),
    enabled: !!orgId && !!selectedBotId,
  })

  return (
    <DashboardLayout>
      <PageHeader title="Knowledge Base" description="Documents and FAQs your chatbots are trained on." />

      {chatbotsLoading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner />
        </div>
      ) : chatbots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white py-20 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Bot className="size-6" />
          </div>
          <p className="max-w-sm text-sm text-brand-text-secondary">
            Create a chatbot first, then come back here to train it on your content.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {chatbots.map((bot) => {
              const selected = bot.id === selectedBotId
              return (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBotId(bot.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-border bg-white text-brand-text-secondary hover:border-violet-300'
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: bot.theme_color || '#7C3AED' }}
                  />
                  {bot.name}
                </button>
              )
            })}
          </div>

          {documentsLoading ? (
            <div className="flex justify-center py-24">
              <LoadingSpinner />
            </div>
          ) : (
            selectedBotId && <KnowledgeTab chatbotId={selectedBotId} documents={documents} />
          )}
        </>
      )}
    </DashboardLayout>
  )
}
